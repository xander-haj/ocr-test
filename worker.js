// worker.js
// Web Worker script handling the OCR processing using Tesseract.js

importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@2/dist/tesseract.min.js');

let tesseractWorker;

onmessage = function (e) {
    if (e.data.cmd === 'init') {
        let numWorkers = e.data.numWorkers || 1;
        tesseractWorker = Tesseract.createWorker({
            logger: m => console.log(m),
            workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@2/dist/worker.min.js',
            langPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@2/lang/',
            corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@2/engines/tesseract-core.wasm.js',
            cacheMethod: 'none'
        });
        (async () => {
            await tesseractWorker.load();
            await tesseractWorker.loadLanguage('eng');
            await tesseractWorker.initialize('eng');
            postMessage({ status: 'initialized' });
        })();
    } else if (e.data.imageData && e.data.lang) {
        let { imageData, lang } = e.data;
        (async () => {
            await tesseractWorker.loadLanguage(lang);
            await tesseractWorker.initialize(lang);
            let { data: { text } } = await tesseractWorker.recognize(imageData);
            postMessage({ status: 'result', text });
        })().catch(err => {
            console.error(err);
            postMessage({ status: 'error', text: 'Error: ' + err.message });
        });
    }
};
