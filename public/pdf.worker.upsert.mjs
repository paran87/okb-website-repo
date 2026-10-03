// Loads the polyfill first (static imports run in order), then the real worker.
import "/pdfjs/upsert-polyfill.mjs";
import "/pdf.worker.min.mjs";
