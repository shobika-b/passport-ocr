import { createWorker, PSM } from 'tesseract.js';

async function extractFromPassport(imagePath) {
    const worker = await createWorker('eng', 0);
    await worker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ<0123456789',
        tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
        preserve_interword_spaces: 1
    });
    const { data: { text } } = await worker.recognize(imagePath);
    console.log("Passport text:", text);

    const mrzLines = extractMRZ(text);
    console.log("mrzLines", mrzLines)
    if (mrzLines.length === 2) {
        const details = parseMRZ(mrzLines);
        console.log("Parsed Passport Details:", details);
    } else {
        console.log("Failed to detect MRZ properly.");
    }

    await worker.terminate();
}

function extractMRZ(text) {
    const lines = text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && l.includes('<<'));
    if (lines.length == 2) {
        return lines
    }
    return [];
}

function parseMRZ(lines) {
    const [line1, line2] = lines.map(line => line.padEnd(44, '<'));
    return {
        documentType: line1[0],
        issuingCountry: line1.slice(2, 5).replace(/</g, ''),
        lastName: line1.slice(5, line1.indexOf('<<', 5)).replace('<', ' '),
        firstName: line1
            .slice(line1.indexOf('<<', line1.indexOf('<<', 5)) + 2)
            .replace(/</g, ' ')
            .trim(),
        passportNumber: line2.slice(0, 9).replace(/</g, ''),
        nationality: line2.slice(10, 13).replace(/</g, ''),
        birthDate: formatDate(line2.slice(13, 19), "birth"),
        sex: line2[20],
        expiryDate: formatDate(line2.slice(21, 27), "expiry"),
    };
}

function formatDate(raw, type = 'birth') {
    const year = parseInt(raw.slice(0, 2), 10);
    const month = raw.slice(2, 4);
    const day = raw.slice(4, 6);
    const currentYear = new Date().getFullYear() % 100;

    let fullYear;
    if (type === 'birth') {
        fullYear = year <= currentYear ? 2000 + year : 1900 + year;
    } else if (type === 'expiry') {
        fullYear = year >= currentYear ? 2000 + year : 1900 + year;
    } else {
        throw new Error("type must be 'birth' or 'expiry'");
    }

    return `${day}-${month}-${fullYear}`;
}



extractFromPassport('./passport-specimen-somaliland.jpg');