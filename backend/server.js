require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const store = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;
const SECRET = process.env.JWT_SECRET || "development_secret_change_me";
const DEPARTMENTS = ["CTE", "CCJE", "CICS", "CBM", "CAS"];
app.use(cors());
app.use(express.json());

const data = () => store.data;
const id = value => Number(value);
const cleanDept = value => DEPARTMENTS.includes(String(value || "").toUpperCase()) ? String(value).toUpperCase() : null;
function tokenFor(user) {
  return jwt.sign({ id: user.id, role: user.role, fullName: user.fullName }, SECRET, { expiresIn: "8h" });
}
function auth(req, res, next) {
  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  try { req.user = jwt.verify(token, SECRET); next(); }
  catch { res.status(401).json({ error: "Please log in to continue." }); }
}
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Administrator access required." });
  next();
}
function safeUser(user) {
  return { id:user.id, fullName:user.fullName, studentId:user.studentId, email:user.email, role:user.role, departmentCode:user.departmentCode || "" };
}
function currentElection(departmentCode) {
  return [...data().elections].filter(e => !departmentCode || e.departmentCode === departmentCode)
    .sort((a,b)=>b.id-a.id)[0] || null;
}
function candidateWithPosition(candidate) {
  const position = data().positions.find(p => p.id === candidate.positionId);
  return { ...candidate, positionName: position?.name || "Unknown position" };
}

app.get("/api/health", (req,res)=>res.json({status:"ok",message:"JSON database active; SQLite is not used."}));
app.get("/api/departments", auth, (req,res)=>res.json(DEPARTMENTS.map(code=>({code,name:({CTE:"College of Teacher Education",CCJE:"College of Criminal Justice Education",CICS:"College of Information and Computing Sciences",CBM:"College of Business and Management",CAS:"College of Arts and Sciences"})[code],logo:`/logos/${code.toLowerCase()}.jfif`}))));

app.post("/api/auth/register", (req,res)=>{
  const {fullName,studentId,email,password}=req.body;
  const departmentCode=cleanDept(req.body.departmentCode);
  if(!fullName||!studentId||!email||!password||!departmentCode) return res.status(400).json({error:"Complete all fields and select your department."});
  if(password.length<6) return res.status(400).json({error:"Password must be at least 6 characters."});
  const normalizedEmail=email.trim().toLowerCase();
  if(data().users.some(u=>u.email===normalizedEmail||u.studentId===studentId.trim())) return res.status(409).json({error:"Student ID or email is already registered."});
  const user=store.add("users",{fullName:fullName.trim(),studentId:studentId.trim(),email:normalizedEmail,password:bcrypt.hashSync(password,10),role:"voter",departmentCode,createdAt:new Date().toISOString()});
  res.status(201).json({token:tokenFor(user),user:safeUser(user)});
});
app.post("/api/auth/login",(req,res)=>{
  const user=data().users.find(u=>u.email===(req.body.email||"").trim().toLowerCase());
  if(!user||!bcrypt.compareSync(req.body.password||"",user.password)) return res.status(401).json({error:"Invalid email or password."});
  res.json({token:tokenFor(user),user:safeUser(user)});
});
app.get("/api/auth/me",auth,(req,res)=>{
  const user=data().users.find(u=>u.id===req.user.id);
  if(!user) return res.status(404).json({error:"Account not found."});
  res.json({user:safeUser(user)});
});

app.get("/api/dashboard",auth,(req,res)=>{
  const dept=req.user.role==="admin"?cleanDept(req.query.department):req.user.departmentCode;
  const election=currentElection(dept);
  const positions=data().positions.filter(p=>p.departmentCode===dept);
  const candidates=data().candidates.filter(c=>c.departmentCode===dept);
  const votes=data().votes.filter(v=>v.electionId===election?.id);
  const stats={voters:data().users.filter(u=>u.role==="voter"&&(!dept||u.departmentCode===dept)).length,candidates:candidates.length,positions:positions.length,votes:votes.length};
  const myVotes=req.user.role==="voter"?votes.filter(v=>v.voterId===req.user.id).length:0;
  res.json({election,stats,myVotes,departmentCode:dept});
});

app.get("/api/positions",auth,(req,res)=>{
  const dept=req.user.role==="admin"?cleanDept(req.query.department):req.user.departmentCode;
  res.json(data().positions.filter(p=>p.departmentCode===dept).sort((a,b)=>a.id-b.id));
});
app.post("/api/positions",auth,adminOnly,(req,res)=>{
  const name=(req.body.name||"").trim(), departmentCode=cleanDept(req.body.departmentCode);
  if(!name||!departmentCode) return res.status(400).json({error:"Position name and department are required."});
  if(data().positions.some(p=>p.departmentCode===departmentCode&&p.name.toLowerCase()===name.toLowerCase())) return res.status(409).json({error:"That position already exists in this department."});
  res.status(201).json(store.add("positions",{name,departmentCode,description:req.body.description||""}));
});
app.delete("/api/positions/:id",auth,adminOnly,(req,res)=>{
  const positionId=id(req.params.id);
  if(data().candidates.some(c=>c.positionId===positionId)||data().votes.some(v=>v.positionId===positionId)) return res.status(400).json({error:"Cannot delete a position assigned to candidates or votes."});
  if(!store.remove("positions",positionId)) return res.status(404).json({error:"Position not found."});
  res.json({message:"Position deleted."});
});

app.get("/api/candidates",auth,(req,res)=>{
  const dept=req.user.role==="admin"?cleanDept(req.query.department):req.user.departmentCode;
  const q=(req.query.q||"").toLowerCase();
  res.json(data().candidates.filter(c=>c.departmentCode===dept).map(candidateWithPosition).filter(c=>`${c.fullName} ${c.studentId} ${c.positionName}`.toLowerCase().includes(q)).sort((a,b)=>a.positionId-b.positionId||a.fullName.localeCompare(b.fullName)));
});
app.post("/api/candidates",auth,adminOnly,(req,res)=>{
  const {fullName,studentId,party="",platform="",photoUrl=""}=req.body;
  const posId=id(req.body.positionId),departmentCode=cleanDept(req.body.departmentCode);
  if(!fullName||!studentId||!departmentCode||!data().positions.some(p=>p.id===posId&&p.departmentCode===departmentCode)) return res.status(400).json({error:"Enter candidate details, department, and a matching position."});
  const c=store.add("candidates",{fullName:fullName.trim(),studentId:studentId.trim(),party,platform,photoUrl,positionId:posId,departmentCode});
  res.status(201).json(candidateWithPosition(c));
});
app.put("/api/candidates/:id",auth,adminOnly,(req,res)=>{
  const {fullName,studentId,party="",platform="",photoUrl=""}=req.body;
  const posId=id(req.body.positionId),departmentCode=cleanDept(req.body.departmentCode),candidateId=id(req.params.id);
  if(!fullName||!studentId||!departmentCode||!data().positions.some(p=>p.id===posId&&p.departmentCode===departmentCode)) return res.status(400).json({error:"Complete the required candidate fields."});
  if(data().votes.some(v=>v.candidateId===candidateId)) return res.status(400).json({error:"A candidate with recorded votes cannot be edited."});
  const updated=store.update("candidates",candidateId,{fullName:fullName.trim(),studentId:studentId.trim(),party,platform,photoUrl,positionId:posId,departmentCode});
  if(!updated) return res.status(404).json({error:"Candidate not found."});
  res.json(candidateWithPosition(updated));
});
app.delete("/api/candidates/:id",auth,adminOnly,(req,res)=>{
  const candidateId=id(req.params.id);
  if(data().votes.some(v=>v.candidateId===candidateId)) return res.status(400).json({error:"Cannot delete a candidate who already has votes."});
  if(!store.remove("candidates",candidateId)) return res.status(404).json({error:"Candidate not found."});
  res.json({message:"Candidate deleted."});
});

app.get("/api/voters",auth,adminOnly,(req,res)=>{
  const dept=cleanDept(req.query.department);
  res.json(data().users.filter(u=>u.role==="voter"&&(!dept||u.departmentCode===dept)).map(({id,fullName,studentId,email,departmentCode,createdAt})=>({id,fullName,studentId,email,departmentCode,createdAt})));
});
app.delete("/api/voters/:id",auth,adminOnly,(req,res)=>{
  const voterId=id(req.params.id);
  if(data().votes.some(v=>v.voterId===voterId)) return res.status(400).json({error:"Cannot delete a voter with recorded votes."});
  const voter=data().users.find(u=>u.id===voterId&&u.role==="voter");
  if(!voter) return res.status(404).json({error:"Voter not found."});
  store.remove("users",voterId); res.json({message:"Voter deleted."});
});

app.get("/api/election",auth,(req,res)=>res.json(currentElection(req.user.role==="admin"?cleanDept(req.query.department):req.user.departmentCode)));
app.put("/api/election",auth,adminOnly,(req,res)=>{
  const {title,status}=req.body,departmentCode=cleanDept(req.body.departmentCode);
  if(!title||!["open","closed"].includes(status)||!departmentCode) return res.status(400).json({error:"Provide title, department, and valid status."});
  let election=currentElection(departmentCode);
  if(!election) election=store.add("elections",{title,status,departmentCode,createdAt:new Date().toISOString()});
  else election=store.update("elections",election.id,{title,status});
  res.json(election);
});

app.post("/api/votes",auth,(req,res)=>{
  if(req.user.role!=="voter") return res.status(403).json({error:"Only registered voters can cast votes."});
  const election=currentElection(req.user.departmentCode);
  if(!election||election.status!=="open") return res.status(400).json({error:"Voting is currently closed for your department."});
  const selections=req.body.selections;
  if(!Array.isArray(selections)||!selections.length) return res.status(400).json({error:"Select at least one candidate."});
  const positionIds=new Set();
  for(const s of selections){
    const positionId=id(s.positionId),candidateId=id(s.candidateId);
    if(positionIds.has(positionId)) return res.status(400).json({error:"Only one candidate may be selected per position."});
    positionIds.add(positionId);
    if(!data().positions.some(p=>p.id===positionId&&p.departmentCode===req.user.departmentCode)||!data().candidates.some(c=>c.id===candidateId&&c.positionId===positionId&&c.departmentCode===req.user.departmentCode)) return res.status(400).json({error:"A selected candidate is invalid for your department."});
    if(data().votes.some(v=>v.electionId===election.id&&v.voterId===req.user.id&&v.positionId===positionId)) return res.status(409).json({error:"You have already voted for one or more selected positions."});
  }
  selections.forEach(s=>store.add("votes",{electionId:election.id,voterId:req.user.id,positionId:id(s.positionId),candidateId:id(s.candidateId),createdAt:new Date().toISOString()}));
  res.status(201).json({message:"Your department votes have been submitted."});
});
app.get("/api/results",auth,(req,res)=>{
  const dept=req.user.role==="admin"?cleanDept(req.query.department):req.user.departmentCode;
  const election=currentElection(dept);
  if(!election) return res.json([]);
  if(req.user.role!=="admin"&&election.status!=="closed") return res.status(403).json({error:"Results will be available after your department election closes."});
  const rows=[];
  for(const p of data().positions.filter(x=>x.departmentCode===dept)){
    const candidates=data().candidates.filter(c=>c.positionId===p.id);
    if(!candidates.length) rows.push({positionId:p.id,positionName:p.name,candidateId:null,fullName:null,party:null,voteCount:0});
    for(const c of candidates) rows.push({positionId:p.id,positionName:p.name,candidateId:c.id,fullName:c.fullName,party:c.party,voteCount:data().votes.filter(v=>v.electionId===election.id&&v.candidateId===c.id).length});
  }
  rows.sort((a,b)=>a.positionId-b.positionId||b.voteCount-a.voteCount);
  res.json(rows);
});
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:"An unexpected server error occurred."});});
app.listen(PORT,()=>console.log(`Online Voting API running at http://localhost:${PORT}`));
