import { exec } from "child_process";
import { promisify } from "util";
import { existsSync } from "fs";

const execAsync = promisify(exec);

/**
 * Open the native Windows Folder Picker dialog.
 * Opens the native File Explorer folder selection window (This PC, Drives, Quick Access).
 * Returns the selected path as a string, or null if cancelled.
 */
export async function openNativeFolderPicker(title = "Select Movies Folder"): Promise<string | null> {
  const psScript = `
Add-Type -AssemblyName System.Windows.Forms
$dialog = New-Object System.Windows.Forms.FolderBrowserDialog
$dialog.Description = "${title.replace(/"/g, '`"')}"
$dialog.UseDescriptionForTitle = $true
$dialog.ShowNewFolderButton = $true
$result = $dialog.ShowDialog()
if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
  [Console]::WriteLine($dialog.SelectedPath)
}
`.trim();

  try {
    const encoded = Buffer.from(psScript, "utf16le").toString("base64");
    const { stdout } = await execAsync(`powershell.exe -NoProfile -NonInteractive -STA -EncodedCommand ${encoded}`);
    const selected = stdout.trim();
    if (selected && existsSync(selected)) {
      return selected.replace(/\\/g, "/");
    }
    return null;
  } catch (err) {
    console.error("Native folder picker error:", err);
    return null;
  }
}
