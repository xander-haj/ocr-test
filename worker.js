// worker.js
// Web Worker script handling the OCR processing using Tesseract.js

importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js');

let tesseractWorker;

onmessage = function (e) {
    if (e.data.cmd === 'init') {
        let numWorkers = e.data.numWorkers || 1;
        tesseractWorker = Tesseract.createWorker({
            logger: m => console.log(m)
        });
        (async () => {
            await tesseractWorker.load();
            await tesseractWorker.loadLanguage('eng');
            await tesseractWorker.initialize('eng');
            postMessage({ status: 'initialized' });
        })();
    } else if (e.data.imageDataURL && e.data.lang) {
        let { imageDataURL, lang } = e.data;
        (async () => {
            await tesseractWorker.loadLanguage(lang);
            await tesseractWorker.initialize(lang);
            let { data: { text } } = await tesseractWorker.recognize(imageDataURL);
            postMessage({ status: 'result', text });
        })().catch(err => {
            console.error(err);
            postMessage({ status: 'error', text: 'Error: ' + err.message });
        });
    }
};
