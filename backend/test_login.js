const bcrypt = require('bcrypt');
const password = 'FitTrackDemo123!';
const hashInDb = '$2b$10$EPm95P.r6/YkI/8zN3W2rOFXWn3sWz7c7O9Lz7s/wQ.4j.9/v.V3W';

(async () => {
    const isMatch = await bcrypt.compare(password, hashInDb);
    console.log('Does password match hash?', isMatch);
    
    if (!isMatch) {
        console.log('Generating correct hash...');
        const correctHash = await bcrypt.hash(password, 10);
        console.log('Correct hash:', correctHash);
    }
})();
