const required = [20, 19, 4];
const current = process.version.slice(1).split(".").map(Number);

function isOlder(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] < b[i]) return true;
    if (a[i] > b[i]) return false;
  }
  return false;
}

if (isOlder(current, required)) {
  console.error(
    `\nNode ${process.version} is too old for Expo 54 / Metro 0.83 (need >= 20.19.4).`,
  );
  console.error("Run: nvm install && nvm use && npm run web\n");
  process.exit(1);
}
