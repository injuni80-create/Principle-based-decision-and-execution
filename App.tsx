import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, 
  Compass, 
  History, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2,
  Save,
  Menu,
  X,
  Settings,
  Key,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Button } from './components/Button';
import { analyzeSituation, synthesizeAdvice, validateApiKey } from './services/geminiService';
import { Principle, DecisionRecord, ViewState, RelevantPrinciple } from './types';

// Default starter principles
const DEFAULT_PRINCIPLES: Principle[] = [
  { id: '1', title: '정직과 신뢰', description: '더 힘들더라도 밤에 편안히 잠들 수 있는, 양심에 부끄럽지 않은 길을 선택한다.' },
  { id: '2', title: '성장 마인드셋', description: '현실 안주보다는 배움과 새로운 기술을 익힐 수 있는 기회를 우선시한다.' },
  { id: '3', title: '가족과의 균형', description: '사회적 성공이 가족 관계의 실패를 정당화할 수 없다.' },
  { id: '4', title: '경제적 현명함', description: '가치 있는 곳에 투자하고, 불필요한 빚을 피하며, 안전망을 유지한다.' },
  { id: '5', title: '건강이 최우선', description: '단기적인 이익을 위해 신체적, 정신적 건강을 타협하지 않는다.' },
];

// Simple obfuscation for local storage (Not military grade, but prevents plain text reading)
const encryptKey = (key: string) => {
  try {
    return btoa(key);
  } catch (e) { return ''; }
};

const decryptKey = (cypher: string) => {
  try {
    return atob(cypher);
  } catch (e) { return ''; }
};

const App: React.FC = () => {
  // State
  const [view, setView] = useState<ViewState>(ViewState.ONBOARDING);
  const [principles, setPrinciples] = useState<Principle[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  
  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [tempApiKey, setTempApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');

  // UI State
  const [editingId, setEditingId] = useState<string | null>(null);

  // Active Decision State
  const [currentSituation, setCurrentSituation] = useState('');
  const [analysisResult, setAnalysisResult] = useState<RelevantPrinciple[]>([]);
  const [finalAdvice, setFinalAdvice] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewHistoryItem, setViewHistoryItem] = useState<DecisionRecord | null>(null);

  // Load data on mount
  useEffect(() => {
    const savedPrinciples = localStorage.getItem('principia_principles');
    const savedDecisions = localStorage.getItem('principia_decisions');
    const savedKey = localStorage.getItem('principia_api_key');

    if (savedPrinciples) {
      setPrinciples(JSON.parse(savedPrinciples));
      setView(ViewState.DASHBOARD); // Skip onboarding if data exists
    } else {
      setPrinciples(DEFAULT_PRINCIPLES);
      setView(ViewState.ONBOARDING);
    }

    if (savedDecisions) {
      setDecisions(JSON.parse(savedDecisions));
    }

    if (savedKey) {
      setApiKey(decryptKey(savedKey));
    }
  }, []);

  // Persist data
  const savePrinciples = (newPrinciples: Principle[]) => {
    setPrinciples(newPrinciples);
    localStorage.setItem('principia_principles', JSON.stringify(newPrinciples));
  };

  const saveDecision = (record: DecisionRecord) => {
    const newDecisions = [record, ...decisions];
    setDecisions(newDecisions);
    localStorage.setItem('principia_decisions', JSON.stringify(newDecisions));
  };

  const handleSaveApiKey = async () => {
    setKeyStatus('testing');
    const isValid = await validateApiKey(tempApiKey);
    
    if (isValid) {
      setKeyStatus('valid');
      setApiKey(tempApiKey);
      localStorage.setItem('principia_api_key', encryptKey(tempApiKey));
      setTimeout(() => {
        setIsSettingsOpen(false);
        setKeyStatus('idle');
      }, 1000);
    } else {
      setKeyStatus('invalid');
    }
  };

  // --- Components ---

  const SettingsModal = () => {
    if (!isSettingsOpen) return null;

    return (
      <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="p-6 border-b border-stone-100 flex justify-between items-center bg-stone-50">
            <h3 className="font-serif text-xl text-stone-800 flex items-center gap-2">
              <Settings size={20} /> 설정
            </h3>
            <button onClick={() => setIsSettingsOpen(false)} className="text-stone-400 hover:text-stone-600">
              <X size={20} />
            </button>
          </div>
          
          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-stone-700 mb-2 flex items-center gap-2">
                <Key size={16} /> Gemini API Key
              </label>
              <p className="text-xs text-stone-500 mb-3">
                앱 사용을 위해 Google Gemini API Key가 필요합니다. 
                키는 서버로 전송되지 않으며, 브라우저에 암호화되어 저장됩니다.
              </p>
              <div className="relative">
                <input 
                  type="password" 
                  value={tempApiKey}
                  onChange={(e) => {
                    setTempApiKey(e.target.value);
                    setKeyStatus('idle');
                  }}
                  placeholder="AIzaSy..."
                  className="w-full p-3 pl-4 pr-4 border border-stone-200 rounded-lg focus:ring-2 focus:ring-stone-800 focus:outline-none bg-stone-50 font-mono text-sm"
                />
              </div>
            </div>

            {keyStatus === 'invalid' && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <AlertCircle size={16} /> 연결 실패. 키를 확인해주세요.
              </div>
            )}
             {keyStatus === 'valid' && (
              <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-lg">
                <ShieldCheck size={16} /> 연결 성공! 키가 저장되었습니다.
              </div>
            )}

            <div className="flex gap-3 pt-2">
               <Button 
                variant="primary" 
                className="w-full"
                onClick={handleSaveApiKey}
                isLoading={keyStatus === 'testing'}
                disabled={!tempApiKey}
              >
                {keyStatus === 'testing' ? '연결 테스트 중...' : '저장 및 연결 테스트'}
              </Button>
            </div>
            
            <div className="text-center">
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-stone-400 hover:text-stone-600 underline">
                API Key 발급받기 (Google AI Studio)
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const Header = () => (
    <div className="absolute top-4 right-4 z-40">
      <button 
        onClick={() => {
          setTempApiKey(apiKey);
          setKeyStatus('idle');
          setIsSettingsOpen(true);
        }}
        className="bg-white p-2 rounded-full shadow-sm border border-stone-200 text-stone-500 hover:text-stone-800 transition-colors"
        title="API Key 설정"
      >
        <Settings size={20} />
      </button>
    </div>
  );

  // --- Views ---

  const renderOnboarding = () => (
    <div className="max-w-2xl mx-auto py-12 px-4 animate-fade-in relative">
      <Header />
      <div className="text-center mb-12">
        <h1 className="font-serif text-4xl text-stone-800 mb-4">Principia</h1>
        <p className="text-stone-600 text-lg leading-relaxed">
          환영합니다. 인생의 항해를 시작하기 전에 나침반을 맞춰야 합니다.<br/>
          아래 10가지 인생 원칙을 검토하고 나만의 원칙으로 수정해보세요.<br/> 
          이 원칙들은 앞으로 모든 결정의 기준이 될 것입니다.
        </p>
      </div>

      <div className="space-y-6 mb-12">
        {principles.map((p, idx) => (
          <div key={p.id} className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm transition hover:shadow-md">
            {editingId === p.id ? (
              <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-stone-400 text-sm font-sans">{idx + 1}.</span>
                  <input
                    type="text"
                    value={p.title}
                    onChange={(e) => {
                      setPrinciples(principles.map(item => item.id === p.id ? {...item, title: e.target.value} : item));
                    }}
                    className="flex-grow font-serif text-xl font-medium text-stone-800 border-b-2 border-stone-200 focus:border-stone-800 focus:outline-none px-1 py-1 bg-transparent transition-colors"
                    placeholder="원칙 제목"
                    autoFocus
                  />
                </div>
                <textarea
                  value={p.description}
                  onChange={(e) => {
                    setPrinciples(principles.map(item => item.id === p.id ? {...item, description: e.target.value} : item));
                  }}
                  className="w-full text-stone-600 bg-stone-50 border border-stone-200 rounded-lg p-3 focus:ring-2 focus:ring-stone-200 focus:border-stone-400 focus:outline-none resize-none transition-all"
                  rows={3}
                  placeholder="원칙에 대한 설명을 입력하세요..."
                />
                <div className="flex justify-end mt-3">
                  <Button 
                    onClick={() => setEditingId(null)} 
                    className="py-2 px-4 text-sm"
                  >
                    수정 완료
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-serif text-xl font-medium text-stone-800">
                    <span className="text-stone-400 mr-2 text-sm font-sans">{idx + 1}.</span>
                    {p.title}
                  </h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setEditingId(p.id)}
                      className="text-stone-400 hover:text-stone-600 p-1 rounded-full hover:bg-stone-100 transition-colors"
                      aria-label="원칙 수정"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => {
                        if (confirm('정말 이 원칙을 삭제하시겠습니까?')) {
                          const newP = principles.filter(item => item.id !== p.id);
                          setPrinciples(newP);
                        }
                      }}
                      className="text-stone-400 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition-colors"
                      aria-label="원칙 삭제"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
                <p className="text-stone-600">{p.description}</p>
              </>
            )}
          </div>
        ))}

        {principles.length < 10 && (
          <button 
            onClick={() => {
              const id = Date.now().toString();
              const newPrinciple = { id, title: '새로운 원칙', description: '당신의 가치관에 대한 설명입니다.' };
              setPrinciples([...principles, newPrinciple]);
              setEditingId(id);
            }}
            className="w-full py-4 border-2 border-dashed border-stone-300 rounded-xl text-stone-500 hover:border-stone-400 hover:text-stone-700 flex items-center justify-center gap-2 transition-colors"
          >
            <Plus size={20} /> 원칙 추가하기
          </button>
        )}
      </div>

      <div className="flex justify-center">
        <Button 
          onClick={() => {
            savePrinciples(principles);
            setView(ViewState.DASHBOARD);
          }}
          className="px-12 py-4 text-lg"
        >
          나침반 설정 완료
        </Button>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="max-w-4xl mx-auto py-8 px-4 relative">
      <Header />
      <header className="mb-12 flex justify-between items-center mt-8">
        <div>
          <h1 className="font-serif text-3xl text-stone-800">Principia</h1>
          <p className="text-stone-500">당신의 지혜로운 멘토</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => setView(ViewState.PRINCIPLES)}>
            <BookOpen size={18} /> 원칙 관리
          </Button>
          <Button variant="outline" onClick={() => setView(ViewState.HISTORY)}>
            <History size={18} /> 히스토리
          </Button>
        </div>
      </header>

      <div className="bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-stone-200 text-center mb-12">
        <Compass className="w-16 h-16 text-stone-700 mx-auto mb-6" strokeWidth={1.5} />
        <h2 className="font-serif text-2xl text-stone-800 mb-4">인생의 갈림길에 서 계신가요?</h2>
        <p className="text-stone-600 max-w-lg mx-auto mb-8">
          "가치관이 명확하다면 결정을 내리는 것은 어렵지 않습니다." <br/>— 로이 디즈니
        </p>
        <Button 
          onClick={() => {
            if (!apiKey) {
              setTempApiKey('');
              setIsSettingsOpen(true);
              alert("먼저 우측 상단 설정에서 API Key를 등록해주세요.");
              return;
            }
            setCurrentSituation('');
            setAnalysisResult([]);
            setFinalAdvice('');
            setView(ViewState.NEW_DECISION_INPUT);
          }}
          className="text-lg px-8 py-4 w-full md:w-auto"
        >
          새로운 고민 시작하기
        </Button>
      </div>

      <div>
        <h3 className="font-serif text-lg text-stone-700 mb-4 px-2">최근 고민 기록</h3>
        {decisions.length === 0 ? (
          <div className="text-center py-12 text-stone-400 bg-stone-50 rounded-xl border border-stone-100">
            아직 기록이 없습니다. 위 버튼을 눌러 첫 번째 여정을 시작해보세요.
          </div>
        ) : (
          <div className="grid gap-4">
            {decisions.slice(0, 3).map(d => (
              <div key={d.id} onClick={() => { setViewHistoryItem(d); setView(ViewState.HISTORY_DETAIL); }} className="bg-white p-6 rounded-xl border border-stone-100 shadow-sm hover:shadow-md transition cursor-pointer group">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{new Date(d.date).toLocaleDateString('ko-KR')}</span>
                  <ChevronRight size={16} className="text-stone-300 group-hover:text-stone-600" />
                </div>
                <p className="font-medium text-stone-800 line-clamp-1">{d.situation}</p>
                <p className="text-sm text-stone-500 mt-2 line-clamp-2">{d.finalAdvice}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderInput = () => (
    <div className="max-w-2xl mx-auto py-8 px-4 h-full flex flex-col relative">
      <Header />
      <button onClick={() => setView(ViewState.DASHBOARD)} className="text-stone-500 hover:text-stone-800 mb-6 flex items-center gap-2 mt-8">
        <ArrowLeft size={18} /> 홈으로 돌아가기
      </button>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-stone-200 flex-grow flex flex-col">
        <h2 className="font-serif text-2xl text-stone-800 mb-2">상황을 설명해주세요</h2>
        <p className="text-stone-500 mb-6 text-sm">
          솔직하고 구체적으로 적어주세요. 어떤 갈등이 있는지, 어떤 선택지들이 있는지, 누가 관련되어 있는지 알려주세요.
        </p>
        
        <textarea 
          value={currentSituation}
          onChange={(e) => setCurrentSituation(e.target.value)}
          placeholder="해외 지사 발령 제안을 받았는데, 승진 기회이긴 하지만 배우자가 막 이곳에서 꿈꾸던 직장 생활을 시작해서 고민입니다..."
          className="flex-grow w-full p-4 rounded-xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-stone-400 focus:outline-none resize-none font-sans text-lg leading-relaxed text-stone-800 placeholder-stone-400"
          style={{ minHeight: '300px' }}
        />

        <div className="mt-8 flex justify-end">
          <Button 
            onClick={async () => {
              if (!currentSituation.trim()) return;
              if (!apiKey) {
                setIsSettingsOpen(true);
                return;
              }
              setIsProcessing(true);
              try {
                const analysis = await analyzeSituation(apiKey, currentSituation, principles);
                setAnalysisResult(analysis);
                setView(ViewState.DECISION_REFLECTION);
              } catch (e: any) {
                alert(`오류가 발생했습니다: ${e.message}`);
                if (e.message.includes('API Key')) {
                   setIsSettingsOpen(true);
                }
              } finally {
                setIsProcessing(false);
              }
            }}
            disabled={!currentSituation.trim() || isProcessing}
            isLoading={isProcessing}
            className="w-full md:w-auto"
          >
            조언 구하기
          </Button>
        </div>
      </div>
    </div>
  );

  const renderReflection = () => (
    <div className="max-w-2xl mx-auto py-8 px-4 relative">
       <Header />
       <div className="mb-8 mt-8">
        <h2 className="font-serif text-2xl text-stone-800">원칙에 비추어 보기</h2>
        <p className="text-stone-600 mt-2">
          당신의 상황에서 가장 중요하게 고려해야 할 원칙들입니다. 질문에 솔직하게 답하며 생각의 정리를 도와드리겠습니다.
        </p>
      </div>

      <div className="space-y-8">
        {analysisResult.map((item, idx) => (
          <div key={item.principleId} className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm animate-fade-in" style={{ animationDelay: `${idx * 150}ms` }}>
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-stone-100 text-stone-600 text-xs font-bold rounded-full mb-2">
                원칙: {item.principleTitle}
              </span>
              <h3 className="font-serif text-xl text-stone-800 leading-snug">
                {item.reflectionQuestion}
              </h3>
            </div>
            <textarea
              className="w-full p-3 rounded-lg border border-stone-200 focus:ring-1 focus:ring-stone-400 focus:outline-none text-stone-700 bg-stone-50"
              rows={3}
              placeholder="나의 생각 적기..."
              value={item.userAnswer || ''}
              onChange={(e) => {
                const newResult = [...analysisResult];
                newResult[idx].userAnswer = e.target.value;
                setAnalysisResult(newResult);
              }}
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex justify-end">
        <Button
          onClick={async () => {
            // Check if all answered
            if (analysisResult.some(r => !r.userAnswer?.trim())) {
              alert("모든 질문에 대한 답변을 작성해주세요.");
              return;
            }
            if (!apiKey) {
               setIsSettingsOpen(true);
               return;
            }
            setIsProcessing(true);
            try {
              const advice = await synthesizeAdvice(apiKey, currentSituation, analysisResult);
              setFinalAdvice(advice);
              
              // Save
              const record: DecisionRecord = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                situation: currentSituation,
                relevantPrinciples: analysisResult,
                finalAdvice: advice
              };
              saveDecision(record);
              setView(ViewState.DECISION_RESULT);
            } catch (e: any) {
              alert(`조언 생성 중 오류: ${e.message}`);
            } finally {
              setIsProcessing(false);
            }
          }}
          isLoading={isProcessing}
          className="w-full md:w-auto"
        >
          종합 및 조언 받기
        </Button>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="max-w-3xl mx-auto py-12 px-4 animate-fade-in relative">
      <Header />
      <div className="text-center mb-8 mt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-stone-800 text-white mb-6 shadow-lg">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="font-serif text-3xl text-stone-800">나아가야 할 길</h2>
      </div>

      <div className="bg-white p-8 md:p-12 rounded-2xl border border-stone-200 shadow-lg relative overflow-hidden">
        {/* Decorative quotes background */}
        <div className="absolute top-0 left-0 text-9xl font-serif text-stone-100 opacity-50 transform -translate-x-4 -translate-y-8">"</div>
        
        <div className="relative z-10 space-y-6">
           <div className="prose prose-stone prose-lg max-w-none text-stone-700 whitespace-pre-wrap leading-relaxed">
             {finalAdvice}
           </div>
        </div>
      </div>

      <div className="mt-12 flex justify-center gap-4">
        <Button variant="outline" onClick={() => setView(ViewState.DASHBOARD)}>
          홈으로 돌아가기
        </Button>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="max-w-4xl mx-auto py-8 px-4 relative">
      <Header />
       <button onClick={() => setView(ViewState.DASHBOARD)} className="text-stone-500 hover:text-stone-800 mb-6 flex items-center gap-2 mt-8">
        <ArrowLeft size={18} /> 대시보드로 돌아가기
      </button>
      <h2 className="font-serif text-2xl text-stone-800 mb-6">결정 히스토리</h2>
      
      {decisions.length === 0 ? (
        <p className="text-stone-500">기록이 없습니다.</p>
      ) : (
        <div className="space-y-4">
          {decisions.map(d => (
            <div key={d.id} className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                 <h3 className="font-serif font-medium text-lg text-stone-800">{new Date(d.date).toLocaleDateString('ko-KR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                 <Button variant="ghost" onClick={() => { setViewHistoryItem(d); setView(ViewState.HISTORY_DETAIL); }} className="text-sm">
                   상세 보기
                 </Button>
              </div>
              <p className="text-stone-600 mb-4 bg-stone-50 p-4 rounded-lg italic">"{d.situation}"</p>
              <div className="flex flex-wrap gap-2">
                {d.relevantPrinciples.map(p => (
                   <span key={p.principleId} className="px-2 py-1 bg-stone-100 text-stone-600 text-xs rounded border border-stone-200">{p.principleTitle}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderHistoryDetail = () => {
    if (!viewHistoryItem) return null;
    return (
      <div className="max-w-3xl mx-auto py-8 px-4 relative">
        <Header />
        <button onClick={() => setView(ViewState.HISTORY)} className="text-stone-500 hover:text-stone-800 mb-6 flex items-center gap-2 mt-8">
          <ArrowLeft size={18} /> 목록으로 돌아가기
        </button>
        
        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="bg-stone-50 p-6 border-b border-stone-200">
             <h2 className="font-serif text-2xl text-stone-800">{new Date(viewHistoryItem.date).toLocaleDateString('ko-KR')}에 대한 성찰 기록</h2>
          </div>
          
          <div className="p-8 space-y-8">
            <section>
              <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-2">고민했던 상황</h3>
              <p className="text-stone-800 text-lg">{viewHistoryItem.situation}</p>
            </section>

            <div className="border-t border-stone-100 my-4"></div>

            <section>
              <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">성찰 내용</h3>
              <div className="space-y-6">
                {viewHistoryItem.relevantPrinciples.map((rp, idx) => (
                  <div key={idx} className="bg-stone-50 p-4 rounded-lg">
                    <p className="font-serif text-stone-700 font-medium mb-2">{rp.principleTitle}</p>
                    <p className="text-sm text-stone-500 italic mb-2">{rp.reflectionQuestion}</p>
                    <p className="text-stone-800 pl-4 border-l-2 border-stone-300">{rp.userAnswer}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="border-t border-stone-100 my-4"></div>

            <section>
              <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4">지혜로운 조언</h3>
              <div className="prose prose-stone text-stone-700">
                {viewHistoryItem.finalAdvice}
              </div>
            </section>
          </div>
        </div>
      </div>
    );
  };

  const renderPrinciplesManager = () => (
    <div className="max-w-2xl mx-auto py-8 px-4 relative">
       <Header />
       <button onClick={() => setView(ViewState.DASHBOARD)} className="text-stone-500 hover:text-stone-800 mb-6 flex items-center gap-2 mt-8">
        <ArrowLeft size={18} /> 대시보드로 돌아가기
      </button>
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-serif text-2xl text-stone-800">나의 인생 원칙</h2>
        <Button variant="secondary" onClick={() => savePrinciples(principles)}>
           <Save size={16} /> 변경사항 저장
        </Button>
      </div>

      <div className="space-y-4">
        {principles.map((p, index) => (
          <div key={p.id} className="bg-white p-4 rounded-lg border border-stone-200 flex gap-4">
             <div className="mt-1 text-stone-400 font-bold">{index + 1}.</div>
             <div className="flex-grow space-y-2">
                <input 
                  type="text" 
                  value={p.title} 
                  onChange={(e) => {
                    const newP = [...principles];
                    newP[index].title = e.target.value;
                    setPrinciples(newP);
                  }}
                  className="w-full font-serif font-bold text-stone-800 border-none p-0 focus:ring-0 text-lg"
                />
                <textarea 
                  value={p.description}
                  onChange={(e) => {
                    const newP = [...principles];
                    newP[index].description = e.target.value;
                    setPrinciples(newP);
                  }}
                  rows={2}
                  className="w-full text-stone-600 text-sm border-none p-0 focus:ring-0 resize-none"
                />
             </div>
             <button 
               onClick={() => {
                  if (confirm('정말 삭제하시겠습니까?')) {
                     const newP = principles.filter(i => i.id !== p.id);
                     setPrinciples(newP);
                  }
               }}
               className="text-stone-300 hover:text-red-500 self-start"
             >
               <X size={20} />
             </button>
          </div>
        ))}
        {principles.length < 10 && (
          <Button variant="outline" className="w-full border-dashed" onClick={() => {
             setPrinciples([...principles, { id: Date.now().toString(), title: "새로운 원칙", description: "내용을 입력하세요..." }]);
          }}>
            <Plus size={16} /> 원칙 추가하기
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800 selection:bg-stone-200">
      <SettingsModal />
      {view === ViewState.ONBOARDING && renderOnboarding()}
      {view === ViewState.DASHBOARD && renderDashboard()}
      {view === ViewState.PRINCIPLES && renderPrinciplesManager()}
      {view === ViewState.NEW_DECISION_INPUT && renderInput()}
      {view === ViewState.DECISION_REFLECTION && renderReflection()}
      {view === ViewState.DECISION_RESULT && renderResult()}
      {view === ViewState.HISTORY && renderHistory()}
      {view === ViewState.HISTORY_DETAIL && renderHistoryDetail()}
    </div>
  );
};

export default App;