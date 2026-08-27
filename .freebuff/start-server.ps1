$npm = "C:\Program Files\nodejs\npm.cmd"
$log = ".freebuff\preview-run.log"
$errLog = ".freebuff\preview-run.log.err"
$p = Start-Process -FilePath $npm -ArgumentList "run","dev","--","-p","3002" -RedirectStandardOutput $log -RedirectStandardError $errLog -WindowStyle Hidden -PassThru
Write-Output $p.Id
