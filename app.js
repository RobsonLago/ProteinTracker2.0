
let totalCal=0,totalProt=0,totalCarb=0,totalFat=0

function calcular(){

let peso=parseFloat(document.getElementById("peso").value)
let altura=parseFloat(document.getElementById("altura").value)
let idade=parseFloat(document.getElementById("idade").value)
let sexo=document.getElementById("sexo").value

let tmb

if(sexo=="m"){
tmb=10*peso+6.25*altura-5*idade+5
}else{
tmb=10*peso+6.25*altura-5*idade-161
}

let calorias=tmb*1.4
let proteina=peso*2
let agua=peso*35

document.getElementById("tmb").innerText="TMB: "+Math.round(tmb)
document.getElementById("metaCal").innerText="Meta Calorias: "+Math.round(calorias)
document.getElementById("metaProt").innerText="Proteína diária: "+Math.round(proteina)+" g"
document.getElementById("metaAgua").innerText="Água diária: "+Math.round(agua)+" ml"

criarChecklist(agua)
}

function addFood(){

let select=document.getElementById("foodSelect")
let food=foods[select.value]
let g=parseFloat(document.getElementById("gramas").value)

let cal=(food.cal*g)/100
let prot=(food.prot*g)/100
let carb=(food.carb*g)/100
let fat=(food.fat*g)/100

totalCal+=cal
totalProt+=prot
totalCarb+=carb
totalFat+=fat

let li=document.createElement("li")
li.innerText=food.nome+" "+g+"g"
document.getElementById("lista").appendChild(li)

document.getElementById("totalCal").innerText="Calorias: "+Math.round(totalCal)
document.getElementById("totalProt").innerText="Proteína: "+Math.round(totalProt)+" g"
document.getElementById("totalCarb").innerText="Carboidratos: "+Math.round(totalCarb)+" g"
document.getElementById("totalFat").innerText="Gordura: "+Math.round(totalFat)+" g"
}

function criarChecklist(agua){

let copos=Math.ceil(agua/250)
let div=document.getElementById("waterChecklist")
div.innerHTML=""

for(let i=1;i<=copos;i++){
let box=document.createElement("input")
box.type="checkbox"
div.appendChild(box)
}
}

function carregarAlimentos(){
let select=document.getElementById("foodSelect")

foods.forEach((f,i)=>{
let op=document.createElement("option")
op.value=i
op.innerText=f.nome
select.appendChild(op)
})
}

function startScanner(){

Quagga.init({
inputStream:{
name:"Live",
type:"LiveStream",
target:document.querySelector('#scanner')
},
decoder:{
readers:["ean_reader"]
}
},function(err){
if(!err){Quagga.start()}
})

Quagga.onDetected(data=>{
alert("Código detectado: "+data.codeResult.code)
Quagga.stop()
})
}

function criarGrafico(){

const ctx=document.getElementById('pesoChart')

new Chart(ctx,{
type:'line',
data:{
labels:["Seg","Ter","Qua","Qui","Sex","Sab","Dom"],
datasets:[{
label:"Peso",
data:[82,81.8,81.6,81.4,81.3,81.1,81],
borderWidth:2
}]
}
})

}

carregarAlimentos()
criarGrafico()
