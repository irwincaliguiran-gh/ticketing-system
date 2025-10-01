function loadPage(name){
  google.script.host.close(); // if using dialog
  window.location = name + '.html';
}

function GET_PARAM(k){
  const params = new URLSearchParams(window.location.search);
  return params.get(k);
}
