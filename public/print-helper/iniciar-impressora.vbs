' Cardapio Digital - Inicia o supervisor sem abrir janela preta.
' O supervisor mantem os dois componentes de impressao ativos e os reinicia
' automaticamente se o Windows ou o driver encerrar algum deles.

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set shell = CreateObject("WScript.Shell")
shell.Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptDir & "\agent-watchdog.ps1""", 0, False
