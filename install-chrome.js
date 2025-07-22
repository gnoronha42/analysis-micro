const { exec } = require("child_process");

exec(
  "apt-get update && apt-get install -y wget gnupg2 && " +
    "wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | apt-key add - && " +
    "sh -c 'echo \"deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main\" > /etc/apt/sources.list.d/google-chrome.list' && " +
    "apt-get update && apt-get install -y google-chrome-stable",
  (err, stdout, stderr) => {
    if (err) {
      console.error("Erro ao instalar o Chrome:", stderr);
      process.exit(1);
    } else {
      console.log("Chrome instalado com sucesso");
      process.exit(0);
    }
  }
);
