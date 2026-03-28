import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import logger from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");

if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const persistence = {
    save(filename, data) {
        try {
            const filePath = path.join(DATA_DIR, filename);
            const tempPath = `${filePath}.tmp`;
            fs.writeFileSync(tempPath, JSON.stringify(data, null, 2));
            fs.renameSync(tempPath, filePath); // Atomic rename
        } catch (err) {
            logger.error(`Persistence save failed (${filename}): ${err.message}`);
        }
    },

    load(filename) {
        try {
            const filePath = path.join(DATA_DIR, filename);
            if (!fs.existsSync(filePath)) return null;
            const content = fs.readFileSync(filePath, "utf-8");
            return JSON.parse(content);
        } catch (err) {
            logger.error(`Persistence load failed (${filename}): ${err.message}`);
            return null;
        }
    }
};

export default persistence;
