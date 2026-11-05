const fs=require("fs");
const path=require("path");
const bcrypt=require("bcryptjs");
const filePath=path.join(__dirname,"data.json");
const DEPARTMENTS=["CTE","CCJE","CICS","CBM","CAS"];
const initialData={users:[],positions:[],candidates:[],elections:[],votes:[],counters:{users:1,positions:1,candidates:1,elections:1,votes:1}};
function save(data){const tmp=`${filePath}.tmp`;fs.writeFileSync(tmp,JSON.stringify(data,null,2),"utf8");fs.renameSync(tmp,filePath);}
function load(){
  if(!fs.existsSync(filePath)) save(initialData);
  const d=JSON.parse(fs.readFileSync(filePath,"utf8"));
  for(const k of ["users","positions","candidates","elections","votes"]) d[k] ||= [];
  d.counters ||= {...initialData.counters};
  for(const k of Object.keys(initialData.counters)) if(!Number.isInteger(d.counters[k])) d.counters[k]=Math.max(0,...d[k].map(x=>Number(x.id)||0))+1;
  return d;
}
let data=load();
function nextId(collection){return data.counters[collection]++;}
function add(collection,item){const record={id:nextId(collection),...item};data[collection].push(record);save(data);return record;}
function update(collection,id,changes){const item=data[collection].find(x=>x.id===Number(id));if(!item)return null;Object.assign(item,changes);save(data);return item;}
function remove(collection,id){const i=data[collection].findIndex(x=>x.id===Number(id));if(i<0)return false;data[collection].splice(i,1);save(data);return true;}
function seed(){
  if(!data.users.some(u=>u.email==="admin@heu.edu.ph")) add("users",{fullName:"System Administrator",studentId:"ADMIN-001",email:"admin@heu.edu.ph",password:bcrypt.hashSync("Admin123!",10),role:"admin",createdAt:new Date().toISOString()});
  // Seed one election and common positions per department on a fresh database.
  for(const code of DEPARTMENTS){
    if(!data.elections.some(e=>e.departmentCode===code)) add("elections",{title:`${code} Department Student Election 2026`,status:"open",departmentCode:code,createdAt:new Date().toISOString()});
    if(!data.positions.some(p=>p.departmentCode===code)){
      ["President","Vice President","Secretary","Treasurer","Auditor"].forEach(name=>add("positions",{name,departmentCode:code,description:`${code} department election position`}));
    }
  }
  // Keep older JSON databases usable: assign old global records to CTE.
  data.positions.forEach(p=>{if(!p.departmentCode)p.departmentCode="CTE";});
  data.candidates.forEach(c=>{if(!c.departmentCode)c.departmentCode=data.positions.find(p=>p.id===c.positionId)?.departmentCode||"CTE";});
  data.elections.forEach(e=>{if(!e.departmentCode)e.departmentCode="CTE";});
  data.users.forEach(u=>{if(u.role==="voter"&&!u.departmentCode)u.departmentCode="CTE";});
  save(data);
}
seed();
module.exports={get data(){return data;},save:()=>save(data),add,update,remove,reload:()=>{data=load();return data;}};
