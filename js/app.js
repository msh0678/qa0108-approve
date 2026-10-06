// qa0108-approve: 팀장 승인 단계 화면
window.ETHOS_STEP={v:1,app:"qa0108-approve",shell:"https://ethos.ai.kr https://www.ethos.ai.kr",parent:""};
function ethosTask(){ return new Promise(function(res){ var S=ETHOS_STEP.shell.split(" "); if(window.parent===window||S[0].indexOf("__")===0){res({ok:false,offline:true});return;} var done=false; function on(e){ if(e.source!==window.parent||S.indexOf(e.origin)<0||!e.data||e.data.type!=="ethos.task.context") return; done=true; ETHOS_STEP.parent=e.origin; window.removeEventListener("message",on); res({ok:true,kind:e.data.kind,task:e.data.task||null,input:(e.data.input&&e.data.input.text)||"",run:e.data.run||{},outputs:e.data.outputs||[]}); } window.addEventListener("message",on); S.forEach(function(o){ try{window.parent.postMessage({type:"ethos.task.ready",v:1,app:ETHOS_STEP.app},o);}catch(x){} }); setTimeout(function(){ if(!done){window.removeEventListener("message",on); res({ok:false,offline:true});} },4000); }); }
function ethosTaskSubmit(data){ if(window.parent===window||!ETHOS_STEP.parent) return {ok:false,offline:true}; window.parent.postMessage({type:"ethos.task.submit",v:1,data:data||{}},ETHOS_STEP.parent); return {ok:true,pending:true}; }
// ---- 아래는 화면 동작 (스니펫 이후 추가 코드) ----
(function(){
  // 검수용 예시: 오프라인 미리보기에서 보여줄 값
  var SAMPLE = {
    title: "팀장 승인 요청 (예시)",
    instructions: "요청 요약을 확인한 뒤 확정 금액(원)을 입력해 주세요.",
    input: "신청 항목: 운영비 정산\n요청 금액: 1,250,000원\n요청 사유: 9월 지출 정산",
    fields: [
      {key:"amount", label:"확정 금액(원)", type:"number", required:true},
      {key:"comment", label:"승인 의견", type:"textarea", required:false}
    ]
  };
  var sending = false;

  function $(id){ return document.getElementById(id); }

  // 필드 정의에 맞는 입력칸을 만든다 (text/textarea/number/date/enum/bool)
  function buildFields(fields){
    var box = $("fields"); box.textContent = "";
    (fields || []).forEach(function(f){
      var lab = document.createElement("label");
      lab.setAttribute("for", "f_" + f.key);
      lab.textContent = f.label + (f.required ? " (필수)" : "");
      box.appendChild(lab);
      var el;
      if(f.type === "textarea"){
        el = document.createElement("textarea");
      } else if(f.type === "enum" && f.options && f.options.length){
        el = document.createElement("select");
        f.options.forEach(function(op){
          var o = document.createElement("option");
          o.value = op; o.textContent = op; el.appendChild(o);
        });
      } else if(f.type === "bool"){
        el = document.createElement("select");
        [["true","예"],["false","아니오"]].forEach(function(p){
          var o = document.createElement("option");
          o.value = p[0]; o.textContent = p[1]; el.appendChild(o);
        });
      } else {
        el = document.createElement("input");
        el.type = (f.type === "number" ? "number" : (f.type === "date" ? "date" : "text"));
        if(f.type === "number"){ el.min = "0"; el.step = "1"; el.inputMode = "numeric"; }
      }
      el.id = "f_" + f.key; el.name = f.key;
      if(f.required) el.required = true;
      box.appendChild(el);
    });
  }

  function render(task, inputText, offline){
    $("taskTitle").textContent = (task && task.title) || SAMPLE.title;
    $("taskDesc").textContent = (task && task.instructions) || SAMPLE.instructions;
    $("reqBox").textContent = inputText || SAMPLE.input;
    var fields = (task && task.fields && task.fields.length) ? task.fields : SAMPLE.fields;
    buildFields(fields);
    // 숫자 필드 예시값 (오프라인 미리보기만)
    if(offline){
      var amt = $("f_amount"); if(amt && !amt.value) amt.value = "1250000";
      $("offlineNote").hidden = false;
    }
    $("fields").dataset.keys = JSON.stringify(fields.map(function(f){ return f.key; }));
    $("fields").dataset.spec = JSON.stringify(fields);
  }

  function msg(text, isErr){
    var m = $("msg"); m.textContent = text;
    m.className = "msg" + (isErr ? " err" : "");
  }

  document.addEventListener("DOMContentLoaded", function(){
    var form = $("fieldForm"), btn = $("sendBtn");
    form.addEventListener("submit", function(ev){
      ev.preventDefault();
      if(sending) return; // 연타 중복 저장 방지
      var spec = JSON.parse($("fields").dataset.spec || "[]");
      var data = {}, bad = "";
      spec.forEach(function(f){
        var el = $("f_" + f.key);
        var v = el ? (el.value || "").trim() : "";
        if(f.required && !v) bad = (f.label || f.key) + " 값을 입력해 주세요.";
        if(!bad && f.type === "number" && v && !/^[0-9]+$/.test(v)) bad = "확정 금액은 숫자만 입력해 주세요.";
        data[f.key] = (f.type === "number" && v) ? Number(v) : v;
      });
      if(bad){ msg(bad, true); return; }
      sending = true; btn.disabled = true;
      var r = ethosTaskSubmit(data);
      // 오프라인 미리보기에서는 셸이 없으므로 화면 안내로 확정
      if(!r.ok){ msg("미리보기에서 입력이 확인됐습니다. (실제 반영은 워크플로 안에서 됩니다)"); sending = false; btn.disabled = false; }
      else { msg("입력 반영 요청을 보냈습니다. 아래 확정은 화면 하단 단추를 이용해 주세요."); }
    });

    ethosTask().then(function(ctx){
      if(ctx.offline){ render(null, "", true); return; }
      if(ctx.kind === "task"){ render(ctx.task, ctx.input, false); return; }
      // 시작/결과 종류로 열리면 요약 위주로 표시
      render(ctx.task, ctx.input, false);
    });
  });
})();
