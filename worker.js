// worker.js
// Web Worker script handling the OCR processing using Tesseract.js

importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@2/dist/tesseract.min.js');

let worker;

// Initialize worker with a specific number of threads
onmessage = function (e) {
    if (e.data.cmd === 'init') {
        let numWorkers = e.data.numWorkers || 1;
        Tesseract.create({
            workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@2/dist/worker.min.js',
            langPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@2/dist/lang/',
            corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@2/engines/tesseract-core.wasm.js',
            workerBlobURL: false,
            workerOptions: { numWorkers }
        });
    } else {
        let { imageData, lang } = e.data;
        Tesseract.recognize(
            imageData,
            lang,
            { logger: m => console.log(m) }
        ).then(({ data: { text } }) => {
            postMessage({ status: 'result', text });
        }).catch(err => {
            console.error(err);
            postMessage({ status: 'error', text: 'Error: ' + err.message });
        });
    }
};
