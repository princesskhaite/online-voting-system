import React,{useEffect,useMemo,useState} from "react";
import {LayoutDashboard,Users,UserRound,Vote,Trophy,Settings,LogOut,BookOpen,Search,Plus,Trash2,Pencil,CheckCircle2,ShieldCheck,Menu,X,RefreshCw,Building2} from "lucide-react";

const API=import.meta.env.VITE_API_URL||"http://localhost:5000/api";
const DEPTS=[
 {code:"CTE",name:"College of Teacher Education",logo:"/logos/cte.jfif"},
 {code:"CCJE",name:"College of Criminal Justice Education",logo:"/logos/ccje.jfif"},
 {code:"CICS",name:"College of Information and Computing Sciences",logo:"/logos/cics.jfif"},
 {code:"CBM",name:"College of Business and Management",logo:"/logos/cbm.jfif"},
 {code:"CAS",name:"College of Arts and Sciences",logo:"/logos/cas.jfif"}
];
const blankCandidate={fullName:"",studentId:"",party:"",platform:"",photoUrl:"",positionId:"",departmentCode:"CTE"};
export default function App(){
 const [token,setToken]=useState(localStorage.getItem("ov-token")||"");
 const [user,setUser]=useState(JSON.parse(localStorage.getItem("ov-user")||"null"));
 const [page,setPage]=useState("Dashboard"),[loginMode,setLoginMode]=useState("login");
 const [form,setForm]=useState({fullName:"",studentId:"",email:"",password:"",departmentCode:"CTE"});
 const [department,setDepartment]=useState(user?.departmentCode||"CTE");
 const [data,setData]=useState({stats:{voters:0,candidates:0,positions:0,votes:0},election:null});
 const [candidates,setCandidates]=useState([]),[positions,setPositions]=useState([]),[voters,setVoters]=useState([]),[results,setResults]=useState([]);
 const [candidateForm,setCandidateForm]=useState(blankCandidate),[positionName,setPositionName]=useState("");
 const [search,setSearch]=useState(""),[message,setMessage]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(false);
 const [selections,setSelections]=useState({}),[electionTitle,setElectionTitle]=useState(""),[electionStatus,setElectionStatus]=useState("open"),[mobileOpen,setMobileOpen]=useState(false);
 const isAdmin=user?.role==="admin",dept=DEPTS.find(d=>d.code===department)||DEPTS[0];
 function notify(msg="",err=""){setMessage(msg);setError(err);}
 async function api(path,options={}){
  const response=await fetch(`${API}${path}`,{...options,headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{}) ,...(options.headers||{})}});
  const body=await response.json().catch(()=>({}));if(!response.ok)throw new Error(body.error||"Request failed.");return body;
 }
 async function loadAll(){
  if(!token)return;
  try{
   const qs=isAdmin?`?department=${department}`:"";
   const [dash,pos,cands]=await Promise.all([api(`/dashboard${qs}`),api(`/positions${qs}`),api(`/candidates${qs}`)]);
   setData(dash);setPositions(pos);setCandidates(cands);setElectionTitle(dash.election?.title||"");setElectionStatus(dash.election?.status||"open");
   if(isAdmin)setVoters(await api(`/voters?department=${department}`));
   try{setResults(await api(`/results${qs}`));}catch{setResults([]);}
  }catch(e){notify("",e.message);}
 }
 useEffect(()=>{loadAll();},[token,user?.role,department]);
 useEffect(()=>{if(message||error){const t=setTimeout(()=>notify(),4500);return()=>clearTimeout(t);}},[message,error]);
 async function authenticate(e){
  e.preventDefault();setLoading(true);notify();
  try{const r=await api(`/auth/${loginMode==="login"?"login":"register"}`,{method:"POST",body:JSON.stringify(form)});
   localStorage.setItem("ov-token",r.token);localStorage.setItem("ov-user",JSON.stringify(r.user));setToken(r.token);setUser(r.user);setDepartment(r.user.departmentCode||"CTE");setPage("Dashboard");setForm({fullName:"",studentId:"",email:"",password:"",departmentCode:"CTE"});
  }catch(e){notify("",e.message);}finally{setLoading(false);}
 }
 function logout(){localStorage.removeItem("ov-token");localStorage.removeItem("ov-user");setToken("");setUser(null);notify();}
 async function run(action,success){setLoading(true);notify();try{await action();await loadAll();notify(success);}catch(e){notify("",e.message);}finally{setLoading(false);}}
 async function saveCandidate(e){e.preventDefault();await run(()=>api(candidateForm.id?`/candidates/${candidateForm.id}`:"/candidates",{method:candidateForm.id?"PUT":"POST",body:JSON.stringify({...candidateForm,departmentCode:department})}),candidateForm.id?"Candidate updated.":"Candidate added.");setCandidateForm({...blankCandidate,departmentCode:department});}
 async function submitVote(){
  const selected=Object.entries(selections).map(([positionId,candidateId])=>({positionId:Number(positionId),candidateId:Number(candidateId)}));
  if(!selected.length)return notify("","Select at least one candidate.");
  await run(()=>api("/votes",{method:"POST",body:JSON.stringify({selections:selected})}),"Your department ballot was submitted.");setSelections({});
 }
 const filtered=useMemo(()=>candidates.filter(c=>`${c.fullName} ${c.studentId} ${c.positionName}`.toLowerCase().includes(search.toLowerCase())),[candidates,search]);
 const grouped=positions.map(p=>({...p,candidates:filtered.filter(c=>c.positionId===p.id)}));
 const nav=isAdmin?[["Dashboard",LayoutDashboard],["Voters",Users],["Candidates",UserRound],["Positions",BookOpen],["Election Settings",Settings],["Results",Trophy]]:[["Dashboard",LayoutDashboard],["Candidates",UserRound],["Cast Vote",Vote],["Results",Trophy],["My Profile",ShieldCheck]];
 if(!token)return <div className="auth-wrap"><div className="auth-card"><img className="main-logo" src="/logos/college-main.jfif" alt="Saint Joseph College of Baggao"/><p className="eyebrow">SAINT JOSEPH COLLEGE OF BAGGAO</p><h1>Online Voting System</h1><p className="muted">Department-based student elections</p>
  <div className="tabs"><button className={loginMode==="login"?"active":""} onClick={()=>setLoginMode("login")}>Login</button><button className={loginMode==="register"?"active":""} onClick={()=>setLoginMode("register")}>Voter Registration</button></div>
  <form onSubmit={authenticate} className="form-stack">
   {loginMode==="register"&&<><label>Full name<input required value={form.fullName} onChange={e=>setForm({...form,fullName:e.target.value})} placeholder="Juan Dela Cruz"/></label><label>Student ID<input required value={form.studentId} onChange={e=>setForm({...form,studentId:e.target.value})}/></label><label>Department<select value={form.departmentCode} onChange={e=>setForm({...form,departmentCode:e.target.value})}>{DEPTS.map(d=><option value={d.code} key={d.code}>{d.code} — {d.name}</option>)}</select></label></>}
   <label>Email address<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Password<input required type="password" minLength="6" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>
   <button className="primary full" disabled={loading}>{loading?"Please wait":loginMode==="login"?"Sign in":"Create voter account"}</button>
  </form>{error&&<p className="alert error">{error}</p>}<div className="demo"><b>Demo administrator</b><br/>Email: admin@heu.edu.ph<br/>Password: Admin123!</div>
 </div></div>;

 return <div className="app-shell">
  <aside className={`sidebar ${mobileOpen?"show":""}`}><div className="brand"><img src="/logos/college-main.jfif" alt="College logo"/><div><b>Saint Joseph</b><span>ONLINE VOTING</span></div><button className="mobile-close" onClick={()=>setMobileOpen(false)}><X/></button></div>
   <div className="workspace"><ShieldCheck size={20}/><div><b>Election Workspace</b><small>{dept.name}</small></div><i/></div><p className="nav-label">MENU</p>
   {nav.map(([label,Icon])=><button key={label} className={`nav-link ${page===label?"selected":""}`} onClick={()=>{setPage(label);setMobileOpen(false);notify();}}><Icon size={19}/>{label}</button>)}
   <div className="sidebar-bottom"><div className="user-mini"><div className="avatar">{user?.fullName?.[0]||"U"}</div><div><b>{user?.fullName}</b><small>{user?.role}</small></div></div><button className="nav-link" onClick={logout}><LogOut size={18}/>Log out</button></div>
  </aside>{mobileOpen&&<div className="scrim" onClick={()=>setMobileOpen(false)}/>}
  <main className="main"><header className="topbar"><button className="menu-btn" onClick={()=>setMobileOpen(true)}><Menu/></button><div><span className="eyebrow">SAINT JOSEPH COLLEGE • ELECTIONS</span><h2>{page}</h2></div>
   <div className="top-controls">{isAdmin&&<select value={department} onChange={e=>{setDepartment(e.target.value);setCandidateForm({...blankCandidate,departmentCode:e.target.value});setSelections({});}}>{DEPTS.map(d=><option key={d.code} value={d.code}>{d.code}</option>)}</select>}<div className="top-user"><span className="status-dot"/>{user?.fullName}</div></div>
  </header>
  <div className="content">{(message||error)&&<div className={`alert ${error?"error":"success"}`}>{error||message}</div>}
   {page==="Dashboard"&&<><div className="department-banner"><img src={dept.logo} alt={`${dept.code} logo`}/><div><p className="eyebrow">DEPARTMENT ELECTION</p><h1>{dept.name}</h1><p className="muted">{data.election?.title||"Election not configured"}</p></div><span className={`pill ${data.election?.status==="open"?"green":"gray"}`}>{data.election?.status==="open"?"Voting Open":"Voting Closed"}</span></div>
    <div className="stats-grid">{(isAdmin?[["Registered voters",data.stats.voters,Users],["Candidates",data.stats.candidates,UserRound],["Positions",data.stats.positions,BookOpen],["Votes cast",data.stats.votes,Vote]]:[["Candidates",data.stats.candidates,UserRound],["Available positions",data.stats.positions,BookOpen],["Your votes",data.myVotes,Vote]]).map(([label,value,Icon])=><div className="stat-card" key={label}><div className="stat-icon"><Icon/></div><span>{label}</span><strong>{value}</strong></div>)}</div>
    <section className="panel"><div className="panel-head"><div><h3>Election overview</h3><p className="muted">Department-specific election information</p></div><button className="icon-btn" onClick={loadAll}><RefreshCw size={17}/></button></div><div className="overview-row"><div><small>Department</small><b>{dept.code}</b></div><div><small>Status</small><b>{data.election?.status||"—"}</b></div><div><small>Account type</small><b>{isAdmin?"Administrator":"Student voter"}</b></div></div>{!isAdmin&&<button className="primary" onClick={()=>setPage("Cast Vote")} disabled={data.election?.status!=="open"}>Go to department voting <Vote size={17}/></button>}</section>
    <div className="department-grid">{DEPTS.map(d=><button className={`department-tile ${d.code===department?"active":""}`} key={d.code} onClick={()=>isAdmin&&setDepartment(d.code)} disabled={!isAdmin}><img src={d.logo} alt=""/><span>{d.code}</span></button>)}</div>
   </>}
   {page==="Candidates"&&<><section className="panel"><div className="panel-head"><div><h3>{dept.code} candidates</h3><p className="muted">Candidates are separated by department and position.</p></div><div className="searchbox"><Search size={17}/><input placeholder="Search candidates..." value={search} onChange={e=>setSearch(e.target.value)}/></div></div>{grouped.map(g=><div className="candidate-group" key={g.id}><h4>{g.name}</h4>{g.candidates.length===0?<p className="muted">No candidates registered for this position.</p>:<div className="candidate-grid">{g.candidates.map(c=><CandidateCard key={c.id} c={c}/>)}</div>}</div>)}</section>
   {isAdmin&&<section className="panel admin-form"><h3>{candidateForm.id?"Edit candidate":"Register candidate"} — {department}</h3><form className="grid-form" onSubmit={saveCandidate}>
    <label>Candidate name<input required value={candidateForm.fullName} onChange={e=>setCandidateForm({...candidateForm,fullName:e.target.value})}/></label><label>Student ID<input required value={candidateForm.studentId} onChange={e=>setCandidateForm({...candidateForm,studentId:e.target.value})}/></label><label>Party / organization<input value={candidateForm.party} onChange={e=>setCandidateForm({...candidateForm,party:e.target.value})}/></label><label>Position<select required value={candidateForm.positionId} onChange={e=>setCandidateForm({...candidateForm,positionId:e.target.value})}><option value="">Select position</option>{positions.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select></label><label className="span-two">Platform<textarea value={candidateForm.platform} onChange={e=>setCandidateForm({...candidateForm,platform:e.target.value})}/></label><div className="form-actions"><button className="primary"><Plus size={16}/>{candidateForm.id?"Save changes":"Add candidate"}</button>{candidateForm.id&&<button type="button" className="secondary" onClick={()=>setCandidateForm({...blankCandidate,departmentCode:department})}>Cancel</button>}</div>
   </form><div className="table-wrap"><table><thead><tr><th>Candidate</th><th>Position</th><th>Party</th><th>Actions</th></tr></thead><tbody>{candidates.map(c=><tr key={c.id}><td>{c.fullName}<small>{c.studentId}</small></td><td>{c.positionName}</td><td>{c.party||"—"}</td><td className="actions"><button className="icon-btn" onClick={()=>setCandidateForm({...c})}><Pencil size={16}/></button><button className="danger-icon" onClick={()=>run(()=>api(`/candidates/${c.id}`,{method:"DELETE"}),"Candidate deleted.")}><Trash2 size={16}/></button></td></tr>)}</tbody></table></div></section>}</>}
   {page==="Cast Vote"&&<section className="panel"><div className="panel-head"><div><h3>Cast your {department} vote</h3><p className="muted">Choose one candidate for each position in your department.</p></div><span className={`pill ${data.election?.status==="open"?"green":"gray"}`}>{data.election?.status}</span></div>
    {data.election?.status!=="open"?<p className="alert">Voting is closed for your department.</p>:<>{grouped.map(g=><div className="vote-position" key={g.id}><h4>{g.name}</h4>{g.candidates.length===0?<p className="muted">No candidates available.</p>:g.candidates.map(c=><label className={`vote-option ${Number(selections[g.id])===c.id?"chosen":""}`} key={c.id}><input type="radio" name={`position-${g.id}`} checked={Number(selections[g.id])===c.id} onChange={()=>setSelections({...selections,[g.id]:c.id})}/><CandidateCard c={c} compact/></label>)}</div>)}<button className="primary" onClick={submitVote} disabled={loading}>Submit department ballot <CheckCircle2 size={17}/></button><p className="hint">Submitted selections cannot be changed. Votes are restricted to your registered department.</p></>}
   </section>}
   {page==="Voters"&&isAdmin&&<section className="panel"><div className="panel-head"><div><h3>Registered {department} voters</h3><p className="muted">Voters are listed under their registered department.</p></div><span className="pill">{voters.length} voters</span></div><div className="table-wrap"><table><thead><tr><th>Name</th><th>Student ID</th><th>Email</th><th>Department</th><th>Action</th></tr></thead><tbody>{voters.map(v=><tr key={v.id}><td>{v.fullName}</td><td>{v.studentId}</td><td>{v.email}</td><td>{v.departmentCode}</td><td><button className="danger-icon" onClick={()=>run(()=>api(`/voters/${v.id}`,{method:"DELETE"}),"Voter deleted.")}><Trash2 size={16}/></button></td></tr>)}</tbody></table>{!voters.length&&<p className="empty">No registered voters in this department yet.</p>}</div></section>}
   {page==="Positions"&&isAdmin&&<section className="panel"><h3>Manage {department} positions</h3><form className="inline-form" onSubmit={e=>{e.preventDefault();run(()=>api("/positions",{method:"POST",body:JSON.stringify({name:positionName,departmentCode:department})}),"Position added.");setPositionName("");}}><input required placeholder="e.g. Auditor" value={positionName} onChange={e=>setPositionName(e.target.value)}/><button className="primary"><Plus size={16}/> Add position</button></form><div className="position-list">{positions.map(p=><div className="position-item" key={p.id}><div><b>{p.name}</b><small>{candidates.filter(c=>c.positionId===p.id).length} candidates</small></div><button className="danger-icon" onClick={()=>run(()=>api(`/positions/${p.id}`,{method:"DELETE"}),"Position deleted.")}><Trash2 size={16}/></button></div>)}</div></section>}
   {page==="Election Settings"&&isAdmin&&<section className="panel"><h3>{department} election settings</h3><p className="muted">Each department has its own election title and voting status.</p><form className="form-stack narrow" onSubmit={e=>{e.preventDefault();run(()=>api("/election",{method:"PUT",body:JSON.stringify({title:electionTitle,status:electionStatus,departmentCode:department})}),"Election settings saved.");}}><label>Election title<input required value={electionTitle} onChange={e=>setElectionTitle(e.target.value)}/></label><label>Voting status<select value={electionStatus} onChange={e=>setElectionStatus(e.target.value)}><option value="open">Open voting</option><option value="closed">Close voting</option></select></label><button className="primary">Save election settings</button></form></section>}
   {page==="Results"&&<section className="panel"><div className="panel-head"><div><h3>{department} election results</h3><p className="muted">Results are grouped by department and position.</p></div></div>{data.election?.status!=="closed"&&!isAdmin?<p className="alert">Results appear after this department election is closed.</p>:positions.map(p=>{const rows=results.filter(r=>r.positionId===p.id&&r.candidateId);const max=Math.max(1,...rows.map(r=>r.voteCount));return <div className="result-group" key={p.id}><h4>{p.name}</h4>{rows.length===0?<p className="muted">No candidates or votes recorded.</p>:rows.map(r=><div className="result-row" key={r.candidateId}><div className="result-label"><b>{r.fullName}</b><span>{r.voteCount} votes</span></div><div className="bar"><i style={{width:`${r.voteCount/max*100}%`}}/></div></div>)}</div>;})}</section>}
   {page==="My Profile"&&<section className="panel profile"><div className="avatar large">{user?.fullName?.[0]}</div><h3>{user?.fullName}</h3><p>{user?.email}</p><span className="pill">{user?.role}</span><p className="muted">Student ID: {user?.studentId}</p><p className="muted">Department: {user?.departmentCode}</p></section>}
  </div></main></div>;
}
function CandidateCard({c,compact=false}){return <div className={`candidate-card ${compact?"compact":""}`}><div className="candidate-avatar">{c.photoUrl?<img src={c.photoUrl} alt={c.fullName}/>:c.fullName.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase()}</div><div className="candidate-info"><b>{c.fullName}</b><small>{c.studentId}{c.party?` · ${c.party}`:""}</small>{c.platform&&!compact&&<p>{c.platform}</p>}</div></div>;}
