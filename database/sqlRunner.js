// Runs a .sql file statement-by-statement, honouring MySQL's DELIMITER command
// (needed for CREATE TRIGGER / CREATE PROCEDURE bodies, which contain semicolons).
// Works with mysql2 connections without multipleStatements.
const fs = require('fs');

function splitStatements(text) {
    const out = [];
    let delimiter = ';';
    let buf = [];

    const flush = () => {
        const sql = buf.join('\n').trim();
        if (sql) out.push(sql);
        buf = [];
    };

    for (const raw of text.split(/\r?\n/)) {
        // strip full-line comments and trailing "-- comment" text
        const code = raw.replace(/^\s*--.*$/, '').replace(/\s--\s.*$/, '');
        const d = code.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
        if (d) {
            flush();
            delimiter = d[1];
            continue;
        }
        if (!code.trim()) continue;
        buf.push(code);
        const joined = buf.join('\n').trimEnd();
        if (joined.endsWith(delimiter)) {
            buf = [joined.slice(0, -delimiter.length)];
            flush();
        }
    }
    flush();
    return out;
}

async function runSqlFile(conn, filePath) {
    const statements = splitStatements(fs.readFileSync(filePath, 'utf8'));
    for (const sql of statements) {
        await conn.query(sql);
    }
    return statements.length;
}

module.exports = { splitStatements, runSqlFile };
