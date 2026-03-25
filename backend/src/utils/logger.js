import winston from "winston";

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "HH:mm:ss" }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
      return `[${timestamp}] ${level.toUpperCase().padEnd(5)} ${message}${metaStr}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
