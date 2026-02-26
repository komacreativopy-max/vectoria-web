import React, { useState, useEffect, useRef } from 'react';

function App() {
  const [svg, setSvg] = useState(null);
  const [originalImageSrc, setOriginalImageSrc] = useState(null);
  const [outlineSvg, setOutlineSvg] = useState(null); 
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [currentFile, setCurrentFile] = useState(null); 
  const fileInputRef = useRef(null);

  // --- CONFIGURACIÓN LUPA ---
  const [showMagnifier, setShowMagnifier] = useState(false);
  const [magnifierPos, setMagnifierPos] = useState({ xPercent: 0, yPercent: 0, rawX: 0, rawY: 0 });
  const imageContainerRef = useRef(null); 
  const ZOOM_LEVEL = 1.25; 
  const LENS_SIZE = 200; 
  
  // --- AJUSTES DE VECTORIZACIÓN ---
  const [precision, setPrecision] = useState(4); 
  const [curveMode, setCurveMode] = useState('mixed'); 
  const [stacking, setStacking] = useState('cutout'); 
  const [groupByColor, setGroupByColor] = useState(true); 
  const [fillGaps, setFillGaps] = useState(false); 

  // --- NOTAS ---
  const [comments, setComments] = useState(() => {
    try {
      const saved = localStorage.getItem('vectoria_notes');
      const parsed = saved ? JSON.parse(saved) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) { return []; }
  });
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    localStorage.setItem('vectoria_notes', JSON.stringify(comments));
  }, [comments]);

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    const comment = { id: Date.now(), text: newComment, date: new Date().toLocaleTimeString() };
    setComments([comment, ...comments]);
    setNewComment('');
  };

  const resetToHome = () => {
    setSvg(null);
    setOutlineSvg(null);
    setOriginalImageSrc(null); 
    setCurrentFile(null);
  };

  // --- MOTOR EN LA NUBE ---
  const executeVectorization = async (fileToProcess, prec, stack, curve, group, fill) => {
    setLoading(true);
    const formData = new FormData();
    formData.append('image', fileToProcess);
    formData.append('precision', prec);
    formData.append('stacking', stack);
    formData.append('curveMode', curve);
    formData.append('groupByColor', group);
    formData.append('fillGaps', fill); 

    try {
      // URL de tu motor en Render
      const response = await fetch('https://vectoria-motor.onrender.com/vectorize', { 
        method: 'POST', 
        body: formData 
      });
      
      if (!response.ok) throw new Error("Error en motor");
      const svgText = await response.text();
      
      const blob = new Blob([svgText], { type: 'image/svg+xml' });
      setSvg(URL.createObjectURL(blob));

      const styleTag = `<style>path, polygon, rect, circle, g { fill: none !important; stroke: #00FFFF !important; stroke-width: 1px !important; vector-effect: non-scaling-stroke !important; }</style>`;
      const outlineText = svgText.replace(/<\/svg>/i, `${styleTag}</svg>`);
      const outlineBlob = new Blob([outlineText], { type: 'image/svg+xml' });
      setOutlineSvg(URL.createObjectURL(outlineBlob));

    } catch (err) {
      alert("⚠️ El motor está despertando o hubo un error. Reintenta en 10 segundos.");
      resetToHome();
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (file) => {
    if (!file) return;
    setCurrentFile(file);
    setOriginalImageSrc(URL.createObjectURL(file));
    executeVectorization(file, precision, stacking, curveMode, groupByColor, fillGaps);
  };

  useEffect(() => {
    if (currentFile && svg) {
      executeVectorization(currentFile, precision, stacking, curveMode, groupByColor, fillGaps);
    }
  }, [precision, stacking, curveMode, groupByColor, fillGaps]);

  const handleMouseMove = (e) => {
    if (!imageContainerRef.current) return;
    const { left, top, width, height } = imageContainerRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    setMagnifierPos({ xPercent: (x / width) * 100, yPercent: (y / height) * 100, rawX: x, rawY: y });
  };

  const bgSize = imageContainerRef.current ? `${imageContainerRef.current.offsetWidth * ZOOM_LEVEL}px auto` : "cover";

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans overflow-hidden flex flex-col items-center p-4"
         onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
         onDragLeave={() => setIsDragging(false)}
         onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files[0]); }}>
      
      <header className="w-full max-w-6xl flex justify-between items-center py-6">
        <div onClick={resetToHome} className="cursor-pointer group">
          <h1 className="text-3xl font-black tracking-tighter italic text-blue-500 group-hover:text-blue-400 transition-colors">
            VECTORIA<span className="text-white">.APP</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 tracking-[0.3em] uppercase">Pro Vectorizer</p>
        </div>
        {svg && <button onClick={resetToHome} className="text-xs font-bold bg-slate-800 px-4 py-2 rounded-full hover:bg-slate-700 transition-all">NUEVO LOGO</button>}
      </header>

      <main className="w-full max-w-6xl flex-1 flex flex-col gap-4 min-h-0">
        {!svg ? (
          <div onClick={() => fileInputRef.current.click()} 
               className={`flex-1 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center transition-all cursor-pointer ${isDragging ? "bg-blue-500/10 border-blue-500" : "bg-slate-900/50 border-slate-800 hover:border-slate-600"}`}>
            <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e.target.files[0])} className="hidden" />
            <div className="text-center">
              <div className="text-5xl mb-4">✨</div>
              <h2 className="text-2xl font-bold mb-2">{loading ? "EL MOTOR ESTÁ TRABAJANDO..." : "Suelta tu imagen aquí"}</h2>
              <p className="text-slate-500 text-sm">PNG, JPG o WEBP para convertir a trazados</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 pb-4">
            <aside className="lg:w-64 bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Precisión de trazo</label>
                <input type="range" min="1" max="10" value={precision} onChange={(e) => setPrecision(e.target.value)} className="w-full accent-blue-500" />
                <div className="flex justify-between text-[9px] font-bold text-slate-600 mt-1"><span>GRUESO</span><span>FINO</span></div>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-3">Geometría</label>
                <div className="grid grid-cols-1 gap-2">
                  {['mixed', 'smooth', 'polygon'].map(m => (
                    <button key={m} onClick={() => setCurveMode(m)} className={`py-2 px-3 rounded-lg text-[10px] font-bold uppercase transition-all ${curveMode === m ? "bg-blue-600 text-white" : "bg-slate-850 text-slate-400 hover:bg-slate-800"}`}>
                      {m === 'mixed' ? '📐 Mixto' : m === 'smooth' ? '〰️ Curvo' : '📏 Rectas'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t border-slate-800">
                <form onSubmit={handleAddComment} className="flex flex-col gap-2">
                  <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Nota rápida..." className="bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs focus:outline-none focus:border-blue-500" />
                  <button type="submit" className="bg-slate-800 text-[10px] font-bold p-2 rounded-lg">GUARDAR NOTA</button>
                </form>
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
                  {comments.map(c => (
                    <div key={c.id} className="text-[10px] bg-slate-800/50 p-2 rounded-md border border-slate-800/50">{c.text}</div>
                  ))}
                </div>
              </div>
            </aside>

            <section className="flex-1 flex flex-col gap-4 min-h-0">
              <div ref={imageContainerRef} 
                   onMouseMove={handleMouseMove} onMouseEnter={() => setShowMagnifier(true)} onMouseLeave={() => setShowMagnifier(false)}
                   className="flex-1 bg-white rounded-2xl overflow-hidden relative flex justify-center items-center cursor-none border border-slate-800">
                <img src={svg} alt="Vector" className={`max-h-[90%] max-w-[90%] transition-opacity ${loading ? "opacity-20" : "opacity-100"}`} />
                
                {showMagnifier && originalImageSrc && outlineSvg && !loading && (
                  <div style={{
                    position: 'absolute', pointerEvents: 'none',
                    left: magnifierPos.rawX - LENS_SIZE / 2, top: magnifierPos.rawY - LENS_SIZE / 2,
                    width: LENS_SIZE, height: LENS_SIZE,
                    backgroundImage: `url(${outlineSvg}), url(${originalImageSrc})`,
                    backgroundSize: `${bgSize}, ${bgSize}`,
                    backgroundPosition: `${magnifierPos.xPercent}% ${magnifierPos.yPercent}%, ${magnifierPos.xPercent}% ${magnifierPos.yPercent}%`,
                  }} className="rounded-full border-4 border-blue-500 shadow-2xl z-50 bg-slate-900" />
                )}
                
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm z-20">
                    <div className="bg-slate-900 px-6 py-3 rounded-2xl font-black text-sm animate-pulse">SINCRONIZANDO CON NUBE...</div>
                  </div>
                )}
              </div>
              <a href={svg} download="vectoria_logo.svg" 
                 className="bg-blue-600 hover:bg-blue-500 py-5 rounded-2xl text-center font-black text-lg tracking-widest transition-all shadow-xl active:scale-[0.98]">
                DESCARGAR SVG PROFESIONAL
              </a>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;