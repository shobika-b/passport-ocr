import scribe from 'scribe.js-ocr';


// scribe.extractText(['./passport-specimen-somaliland.jpg'])
//     .then((response) => console.log(response))


scribe.init({ ocr: true }).then(() => {
    scribe.importFiles(['./passport-specimen-somaliland.jpg']).then((response) => {
        scribe.recognize({
            mode: "quality",
            langs: ["eng"],
            modeAdv: "combined",
            // combineMode: "none",
            vanillaMode: true,
            options: {
                tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ<0123456789',
                tessedit_pageseg_mode: 6,
                preserve_interword_spaces: 1,
                // oem: 0
            }
        })
            .then((res) => scribe.exportData("txt").then((text) => {
                console.log(text)
                const mrzLines = extractMRZ(text);
                console.log(mrzLines)
                // if (mrzLines.length === 2) {
                const details = parseMRZ(mrzLines);
                console.log("Parsed Passport Details:", details);
                // } else {
                //     console.log("Failed to detect MRZ properly.");
                // }
                scribe.terminate()
            }))
    })

})

function extractMRZ(text) {
    let lines = text
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && l.includes('<'));
    console.log("lines", lines)
    lines = lines[0].split(" ")
    console.log("lines", lines)
    if (lines.length >= 2) {
        return lines.filter(line => line.length >= 43);
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

    return `${fullYear}-${month}-${day}`;
}