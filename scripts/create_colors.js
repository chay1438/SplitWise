const fs = require('fs');
const path = require('path');

const dir = path.join('android', 'app', 'src', 'main', 'res', 'values');
const file = path.join(dir, 'colors.xml');

try {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const content = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="iconBackground">#FFFFFF</color>
</resources>`;

    fs.writeFileSync(file, content);
    console.log('Successfully created ' + file);
} catch (error) {
    console.error('Error creating file:', error);
    process.exit(1);
}
