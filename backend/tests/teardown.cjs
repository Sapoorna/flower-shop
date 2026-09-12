const fs = require('fs');
const path = require('path');
module.exports = async () => {
  const folder = path.join(__dirname, '../.cache');
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, 'stop-preview'), 'stop');
  await new Promise((resolve) => setTimeout(resolve, 1500));
};
