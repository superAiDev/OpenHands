from __future__ import annotations

import asyncio
import subprocess # Required for CalledProcessError, but actual execution uses asyncio
from typing import TYPE_CHECKING, Any, ClassVar

from openhands.core.logger import openhands_logger as logger
from openhands.events.action import Action, CmdRunAction
from openhands.events.observation import CmdOutputObservation, ErrorObservation, Observation
from openhands.runtime.base import Runtime

if TYPE_CHECKING:
    from openhands.controller.state.state import State


class AndroidRuntime(Runtime):
    """
    Runtime for executing commands on an Android device via Termux.
    Assumes that the environment this runtime operates in has direct access
    to a shell that can execute Termux commands (e.g., running OpenHands
    within Termux, or an ADB shell with Termux context).
    """

    # TODO: Make timeout configurable
    DEFAULT_TIMEOUT: ClassVar[int] = 120  # seconds

    def __init__(self, state: State | None = None):
        super().__init__(state)
        # Android/Termux specific initialization can go here.
        # For now, we assume Termux commands are directly executable.
        logger.info("Initialized AndroidRuntime.")

    async def run(self, action: Action, state: State | None = None) -> Observation:
        """
        Runs the given action on the Android device.
        Currently, only CmdRunAction is supported.
        """
        if not isinstance(action, CmdRunAction):
            return ErrorObservation(
                f"Action type {type(action)} not supported by AndroidRuntime."
            )

        cmd = action.command
        logger.info(f"Executing Termux command: {cmd}")

        try:
            # Using asyncio.create_subprocess_shell to run the command
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                # Consider if a specific shell like 'sh' or 'bash' available in Termux is needed
                # executable='/data/data/com.termux/files/usr/bin/sh' # Example, might need adjustment
            )

            # Wait for the command to complete with a timeout
            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(), timeout=self.DEFAULT_TIMEOUT
            )

            stdout = stdout_bytes.decode('utf-8').strip()
            stderr = stderr_bytes.decode('utf-8').strip()

            if process.returncode == 0:
                logger.info(f"Command executed successfully. Output:\n{stdout}")
                return CmdOutputObservation(
                    command_id=action.id, command=cmd, exit_code=0, content=stdout
                )
            else:
                error_message = f"Command failed with exit code {process.returncode}.\nStderr: {stderr}\nStdout: {stdout}"
                logger.error(error_message)
                return ErrorObservation(content=error_message, error_type="ExecutionFailed")

        except asyncio.TimeoutError:
            error_message = f"Command '{cmd}' timed out after {self.DEFAULT_TIMEOUT} seconds."
            logger.error(error_message)
            # Attempt to kill the process if it times out
            if process and process.returncode is None:
                try:
                    process.kill()
                    await process.wait() # Ensure process is killed
                    logger.info(f"Killed timed-out process for command: {cmd}")
                except Exception as e:
                    logger.error(f"Error killing process for command '{cmd}': {e}")
            return ErrorObservation(content=error_message, error_type="Timeout")

        except FileNotFoundError:
            # This might happen if the shell or a command isn't found.
            # For Termux, core executables should generally be in PATH if running within Termux.
            error_message = f"Command or shell not found for: '{cmd}'. Ensure Termux environment is correctly set up."
            logger.error(error_message)
            return ErrorObservation(content=error_message, error_type="FileNotFound")

        except Exception as e:
            error_message = f"An unexpected error occurred while executing command '{cmd}': {e}"
            logger.error(error_message, exc_info=True)
            return ErrorObservation(content=error_message, error_type="UnexpectedError")

    async def read(self, action: Action, state: State | None = None) -> Observation:
        """
        Reads the content of a file on the Android device.
        Expects a ReadFileAction.
        """
        if not isinstance(action, ReadFileAction): # type: ignore[name-defined] # ReadFileAction might not be imported yet
            return ErrorObservation(
                f"Action type {type(action)} not supported by AndroidRuntime.read."
            )

        filepath = action.path
        cmd = f"cat '{filepath}'"  # Use 'cat' to read the file content
        logger.info(f"Reading file on Android: {filepath}")

        try:
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(), timeout=self.DEFAULT_TIMEOUT
            )

            stdout = stdout_bytes.decode('utf-8') # No strip, want raw content
            stderr = stderr_bytes.decode('utf-8').strip()

            if process.returncode == 0:
                logger.info(f"File '{filepath}' read successfully.")
                # Assuming FileReadObservation exists or CmdOutputObservation can be used
                # For now, using CmdOutputObservation to return content.
                # A dedicated FileReadObservation might be better.
                return CmdOutputObservation(
                    command_id=action.id, command=cmd, exit_code=0, content=stdout
                )
            else:
                error_message = f"Error reading file '{filepath}'. Exit code: {process.returncode}.\nStderr: {stderr}"
                if "No such file or directory" in stderr:
                    logger.error(f"File not found: {filepath}")
                    return ErrorObservation(content=f"File not found: {filepath}", error_type="FileNotFound")
                elif "Permission denied" in stderr:
                    logger.error(f"Permission denied reading file: {filepath}")
                    return ErrorObservation(content=f"Permission denied reading file: {filepath}", error_type="PermissionDenied")
                else:
                    logger.error(error_message)
                    return ErrorObservation(content=error_message, error_type="FileReadError")

        except asyncio.TimeoutError:
            error_message = f"Timeout reading file '{filepath}' after {self.DEFAULT_TIMEOUT} seconds."
            logger.error(error_message)
            if process and process.returncode is None:
                try:
                    process.kill()
                    await process.wait()
                except Exception as e_kill:
                    logger.error(f"Error killing process for file read '{filepath}': {e_kill}")
            return ErrorObservation(content=error_message, error_type="Timeout")
        except Exception as e:
            error_message = f"An unexpected error occurred while reading file '{filepath}': {e}"
            logger.error(error_message, exc_info=True)
            return ErrorObservation(content=error_message, error_type="UnexpectedFileReadError")

    async def write(self, action: Action, state: State | None = None) -> Observation:
        """
        Writes content to a file on the Android device.
        Expects a WriteFileAction.
        """
        if not isinstance(action, WriteFileAction): # type: ignore[name-defined] # WriteFileAction might not be imported yet
            return ErrorObservation(
                f"Action type {type(action)} not supported by AndroidRuntime.write."
            )

        filepath = action.path
        content = action.content

        # Using echo piped to tee to write content. This is generally safer than direct redirection
        # as it handles special characters in content better when properly quoted.
        # However, for arbitrary binary content, this is not safe.
        # For text content, ensure proper escaping if content can contain shell metacharacters.
        # A more robust solution for arbitrary content would involve base64 encoding/decoding
        # or using a helper script on the Termux side.
        # For now, assuming content is text-like and can be handled by shell quoting.

        # Basic escaping for single quotes in content for the `echo` command.
        # This is a simplified approach. A library for shell quoting would be more robust.
        escaped_content = content.replace("'", "'\\''")

        cmd = f"echo -n '{escaped_content}' > '{filepath}'"
        # Alternative using tee: cmd = f"echo -n '{escaped_content}' | tee '{filepath}' > /dev/null"
        # The `> /dev/null` for tee is to suppress its stdout if we only care about writing.

        logger.info(f"Writing to file on Android: {filepath}")

        try:
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE, # Capture stdout to check tee's output if used
                stderr=asyncio.subprocess.PIPE,
            )

            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(), timeout=self.DEFAULT_TIMEOUT
            )

            stderr = stderr_bytes.decode('utf-8').strip()

            if process.returncode == 0:
                logger.info(f"File '{filepath}' written successfully.")
                # Consider what observation to return. Maybe a FileWriteObservation?
                # For now, CmdOutputObservation with empty content.
                return CmdOutputObservation(
                    command_id=action.id, command=cmd, exit_code=0, content=f"File written: {filepath}"
                )
            else:
                error_message = f"Error writing to file '{filepath}'. Exit code: {process.returncode}.\nStderr: {stderr}"
                if "Permission denied" in stderr:
                    logger.error(f"Permission denied writing to file: {filepath}")
                    return ErrorObservation(content=f"Permission denied writing to file: {filepath}", error_type="PermissionDenied")
                # Checking for "No space left on device" is indicative of disk full
                elif "No space left on device" in stderr:
                    logger.error(f"Disk full while writing to file: {filepath}")
                    return ErrorObservation(content=f"Disk full while writing to file: {filepath}", error_type="DiskFull")
                else:
                    logger.error(error_message)
                    return ErrorObservation(content=error_message, error_type="FileWriteError")

        except asyncio.TimeoutError:
            error_message = f"Timeout writing to file '{filepath}' after {self.DEFAULT_TIMEOUT} seconds."
            logger.error(error_message)
            if process and process.returncode is None:
                try:
                    process.kill()
                    await process.wait()
                except Exception as e_kill:
                    logger.error(f"Error killing process for file write '{filepath}': {e_kill}")
            return ErrorObservation(content=error_message, error_type="Timeout")
        except Exception as e:
            error_message = f"An unexpected error occurred while writing to file '{filepath}': {e}"
            logger.error(error_message, exc_info=True)
            return ErrorObservation(content=error_message, error_type="UnexpectedFileWriteError")

    async def list_files(self, action: Action, state: State | None = None) -> Observation:
        """
        Lists files and directories at a given path on the Android device.
        Expects a ListFilesAction.
        """
        if not isinstance(action, ListFilesAction): # type: ignore[name-defined] # ListFilesAction might not be imported yet
            return ErrorObservation(
                f"Action type {type(action)} not supported by AndroidRuntime.list_files."
            )

        dir_path = action.path
        # Using `ls -al` for a detailed listing. Parsing this can be complex.
        # A simpler `ls -A` would just give names.
        # `find {dir_path} -maxdepth 1 -print0` would be more robust for parsing if available and used with null byte separation.
        # For now, proceeding with `ls -al` and basic parsing.
        cmd = f"ls -al '{dir_path}'"
        logger.info(f"Listing files in Android directory: {dir_path}")

        try:
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(), timeout=self.DEFAULT_TIMEOUT
            )

            stdout = stdout_bytes.decode('utf-8').strip()
            stderr = stderr_bytes.decode('utf-8').strip()

            if process.returncode == 0:
                logger.info(f"Files listed successfully for path '{dir_path}'.")
                # Parsing `ls -al` output:
                # Each line represents a file or directory.
                # Example line: drwxr-xr-x 2 u0_a100 u0_a100 4096 2023-05-10 10:00 myfolder
                # We are interested in the names. The last field.
                # Skip the first line which is usually "total X"
                lines = stdout.splitlines()
                if lines and lines[0].startswith("total"):
                    lines = lines[1:]

                # A more robust parser would handle spaces in filenames correctly from `ls -al`
                # This basic parser might struggle with filenames containing multiple spaces.
                # For simplicity, taking the last part of the string.
                # This is a known weak point of parsing `ls` output.
                # Consider `ls -1` or `find` for simpler parsing if detailed info isn't strictly needed.
                file_names = []
                for line in lines:
                    parts = line.split()
                    if parts:
                        file_names.append(parts[-1])

                # For now, returning a simple string list. A structured ListFilesObservation would be better.
                # Using CmdOutputObservation for now.
                return CmdOutputObservation(
                    command_id=action.id, command=cmd, exit_code=0, content='\n'.join(file_names) # Sending as a newline-separated string
                )
            else:
                error_message = f"Error listing files in '{dir_path}'. Exit code: {process.returncode}.\nStderr: {stderr}"
                if "No such file or directory" in stderr:
                    logger.error(f"Directory not found: {dir_path}")
                    return ErrorObservation(content=f"Directory not found: {dir_path}", error_type="DirectoryNotFound")
                elif "Permission denied" in stderr:
                    logger.error(f"Permission denied listing files in: {dir_path}")
                    return ErrorObservation(content=f"Permission denied listing files in: {dir_path}", error_type="PermissionDenied")
                else:
                    logger.error(error_message)
                    return ErrorObservation(content=error_message, error_type="FileListError")

        except asyncio.TimeoutError:
            error_message = f"Timeout listing files in '{dir_path}' after {self.DEFAULT_TIMEOUT} seconds."
            logger.error(error_message)
            if process and process.returncode is None:
                try:
                    process.kill()
                    await process.wait()
                except Exception as e_kill:
                    logger.error(f"Error killing process for file listing '{dir_path}': {e_kill}")
            return ErrorObservation(content=error_message, error_type="Timeout")
        except Exception as e:
            error_message = f"An unexpected error occurred while listing files in '{dir_path}': {e}"
            logger.error(error_message, exc_info=True)
            return ErrorObservation(content=error_message, error_type="UnexpectedFileListError")

    async def browse(self, action: Action, state: State | None = None) -> Observation:
        """
        Opens a URL on the Android device using Termux.
        Expects a BrowseURLAction.
        This implementation uses `termux-open-url` which opens the URL in the
        default web browser. It does not directly return page content.
        A different approach (e.g., using a command-line browser like lynx or w3m)
        would be needed to fetch page content as text.
        """
        if not isinstance(action, BrowseURLAction): # type: ignore[name-defined] # BrowseURLAction might not be imported yet
            return ErrorObservation(
                f"Action type {type(action)} not supported by AndroidRuntime.browse."
            )

        url = action.url
        # Validate URL format roughly
        if not (url.startswith('http://') or url.startswith('https://')):
            return ErrorObservation(content=f"Invalid URL format: {url}. Must start with http:// or https://", error_type="InvalidURL")

        cmd = f"termux-open-url '{url}'"
        logger.info(f"Opening URL on Android: {url}")

        try:
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(), timeout=self.DEFAULT_TIMEOUT # Opening a URL might be quick, but timeout is still good
            )

            # stdout = stdout_bytes.decode('utf-8').strip() # termux-open-url usually doesn't output to stdout
            stderr = stderr_bytes.decode('utf-8').strip()

            if process.returncode == 0:
                logger.info(f"URL '{url}' opened successfully (or command sent).")
                # This action doesn't return page content, just success of command
                return CmdOutputObservation(
                    command_id=action.id, command=cmd, exit_code=0, content=f"URL opened: {url}"
                )
            else:
                error_message = f"Error opening URL '{url}'. Exit code: {process.returncode}.\nStderr: {stderr}"
                # termux-open-url might not give specific errors like "No such file" or "Permission denied"
                # in a way that's easily distinguishable for this generic open action.
                logger.error(error_message)
                return ErrorObservation(content=error_message, error_type="BrowseError")

        except asyncio.TimeoutError:
            error_message = f"Timeout opening URL '{url}' after {self.DEFAULT_TIMEOUT} seconds."
            logger.error(error_message)
            if process and process.returncode is None:
                try:
                    process.kill()
                    await process.wait()
                except Exception as e_kill:
                    logger.error(f"Error killing process for URL open '{url}': {e_kill}")
            return ErrorObservation(content=error_message, error_type="Timeout")
        except Exception as e:
            # This could catch FileNotFoundError if termux-open-url isn't installed,
            # though that's a setup issue.
            error_message = f"An unexpected error occurred while opening URL '{url}': {e}"
            logger.error(error_message, exc_info=True)
            return ErrorObservation(content=error_message, error_type="UnexpectedBrowseError")

    async def run_ipython(self, action: Action, state: State | None = None) -> Observation:
        """
        Runs Python code using IPython within the Termux environment.
        Expects an IPythonRunCellAction.

        Note: This is a simplified implementation that executes code by piping it
        to the `ipython` command. It assumes `ipython` is installed in Termux.
        A more robust solution would involve managing a persistent IPython kernel.
        This implementation will not maintain state between calls like a true Jupyter kernel.
        """
        if not isinstance(action, IPythonRunCellAction): # type: ignore[name-defined] # IPythonRunCellAction might not be imported yet
            return ErrorObservation(
                f"Action type {type(action)} not supported by AndroidRuntime.run_ipython."
            )

        code = action.code
        # Basic escaping for single quotes in code for the `echo` command.
        # More complex code with other shell metacharacters might need more robust escaping.
        escaped_code = code.replace("'", "'\\''")

        # The command attempts to run the code through ipython.
        # Output will include IPython's own prompts/numbering if not suppressed.
        # For cleaner output, one might need to configure ipython or parse its output.
        cmd = f"echo '{escaped_code}' | ipython"
        logger.info(f"Executing IPython code on Android: {code[:100]}...") # Log first 100 chars

        try:
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout_bytes, stderr_bytes = await asyncio.wait_for(
                process.communicate(), timeout=self.DEFAULT_TIMEOUT # IPython startup + execution
            )

            stdout = stdout_bytes.decode('utf-8').strip()
            stderr = stderr_bytes.decode('utf-8').strip()

            # TODO: IPython output often includes input prompts (e.g., "In [1]:", "Out[1]:").
            # These might need to be stripped for cleaner observation content.
            # For now, returning the raw output.

            if process.returncode == 0:
                # Even with exit code 0, IPython might have printed tracebacks to stdout for exceptions in code
                # A more robust check would parse stdout for Python tracebacks.
                logger.info(f"IPython code executed. Output:\n{stdout}")
                return CmdOutputObservation( # Potentially a new IPythonOutputObservation type
                    command_id=action.id, command=cmd, exit_code=0, content=stdout
                )
            else:
                # This usually means ipython command itself failed or was killed.
                error_message = f"Error executing IPython code. Exit code: {process.returncode}.\nStderr: {stderr}\nStdout: {stdout}"
                logger.error(error_message)
                return ErrorObservation(content=error_message, error_type="IPythonExecutionError")

        except asyncio.TimeoutError:
            error_message = f"Timeout executing IPython code after {self.DEFAULT_TIMEOUT} seconds."
            logger.error(error_message)
            if process and process.returncode is None:
                try:
                    process.kill()
                    await process.wait()
                except Exception as e_kill:
                    logger.error(f"Error killing process for IPython execution: {e_kill}")
            return ErrorObservation(content=error_message, error_type="Timeout")
        except Exception as e:
            # Could be FileNotFoundError if 'ipython' is not installed.
            error_message = f"An unexpected error occurred while executing IPython code: {e}"
            logger.error(error_message, exc_info=True)
            return ErrorObservation(content=error_message, error_type="UnexpectedIPythonError")

    @classmethod
    def get_config_class(cls) -> Any:
        # No specific config class for AndroidRuntime yet.
        # Could define a Pydantic model here if config options are needed,
        # e.g., Termux paths, default timeouts, etc.
        return dict

    @classmethod
    def is_sandboxed(cls) -> bool:
        # Termux provides a Linux-like environment on Android.
        # While it's isolated from the main Android OS to some extent,
        # it's not a "sandbox" in the same way Docker or E2B might be.
        # Setting to True implies it's a distinct execution environment.
        # This might need refinement based on security model.
        return True

    def close(self):
        # Any cleanup specific to Android/Termux resources.
        logger.info("Closing AndroidRuntime.")
        super().close()
