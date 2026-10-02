"""Builds dist/Part Stamp.html: src/part-stamp.html with the PDF reader (pdf.js) and PDF builder (pdf-lib)
embedded, and the web fonts removed, so the file works with no internet at all.

Needs:  npm install   (installs pdfjs-dist and pdf-lib from package.json into node_modules)
Run:    python3 build/build_offline.py
"""
import base64, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NM = os.path.join(ROOT, 'node_modules')
src = open(os.path.join(ROOT, 'src', 'part-stamp.html'), encoding='utf-8').read()
pdflib = open(os.path.join(NM, 'pdf-lib/dist/pdf-lib.min.js'), encoding='utf-8').read().replace('</script', '<\\/script')
b64 = lambda p: base64.b64encode(open(os.path.join(NM, p), 'rb').read()).decode()
main, worker = b64('pdfjs-dist/legacy/build/pdf.min.mjs'), b64('pdfjs-dist/legacy/build/pdf.worker.min.mjs')
loader = '''<script type="text/plain" id="lib-pdfjs">''' + main + '''</script>
<script type="text/plain" id="lib-pdfjs-worker">''' + worker + '''</script>
<script>
// Start the built-in PDF reader (pdf.js, Apache 2.0) from the copies stored in this file.
window.__libsReady = (async () => {
  const blobURL = (id) => {
    const b = atob(document.getElementById(id).textContent.trim()), u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return URL.createObjectURL(new Blob([u], { type: "text/javascript" }));
  };
  const lib = await import(blobURL("lib-pdfjs"));
  lib.GlobalWorkerOptions.workerSrc = blobURL("lib-pdfjs-worker");   // each open PDF gets its own background reader
  window.pdfjsLib = lib;
})();
</script>
<script>/* pdf-lib 1.17.1 (MIT) */
''' + pdflib + '''
</script>
'''
a = '<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>\n'
b = '<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js"></script>\n'
assert a in src and b in src, "CDN script tags not found in src/part-stamp.html"
src = src.replace(a, '').replace(b, loader)
src = re.sub(r'<link rel="preconnect"[^>]*>\n?', '', src)
src = re.sub(r'<link rel="stylesheet" href="https://fonts.googleapis.com[^>]*>\n?', '', src)
i = src.index('</style>') + len('</style>')
doc = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n'
os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
out = os.path.join(ROOT, 'dist', 'Part Stamp.html')
open(out, 'w', encoding='utf-8').write(doc + src[:i] + '\n</head>\n<body>\n' + src[i:] + '\n</body>\n</html>\n')
print('built', out, round(os.path.getsize(out) / 1e6, 2), 'MB')
