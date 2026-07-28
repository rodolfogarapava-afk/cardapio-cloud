' Burguer House - Inicia a ponte de impressao sem abrir janela preta.
' Coloque um atalho deste arquivo na pasta Inicializar do Windows para
' que a impressao funcione automaticamente ao ligar o PC.
' (Win+R  ->  shell:startup  ->  cole um atalho deste .vbs)

Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
Set shell = CreateObject("WScript.Shell")
shell.Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & scriptDir & "\print-helper.ps1""", 0, False
