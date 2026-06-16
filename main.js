let scene, camera, renderer;

// ===== INIT =====
scene = new THREE.Scene();

camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth/window.innerHeight,
  0.1,
  1000
);

renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// ===== LIGHT =====
const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(5,10,5);
scene.add(light);

// ===== FLOOR =====
const floorGeo = new THREE.PlaneGeometry(50,50);
const floorMat = new THREE.MeshStandardMaterial({color:0x222222});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI/2;
scene.add(floor);

// ===== WALL =====
function createWall(x,z){
  const geo = new THREE.BoxGeometry(2,2,2);
  const mat = new THREE.MeshStandardMaterial({color:0x5555ff});
  const wall = new THREE.Mesh(geo,mat);
  wall.position.set(x,1,z);
  scene.add(wall);
}

// ===== MAP =====
const map = [
[1,1,1,1,1],
[1,0,0,0,1],
[1,0,1,0,1],
[1,0,0,0,1],
[1,1,1,1,1]
];

for(let z=0;z<map.length;z++){
  for(let x=0;x<map[z].length;x++){
    if(map[z][x]===1){
      createWall(x*3, z*3);
    }
  }
}

// ===== PLAYER =====
camera.position.set(3,1.6,3);

// ===== INPUT =====
let keys = {};
document.addEventListener("keydown", e=>keys[e.key]=true);
document.addEventListener("keyup", e=>keys[e.key]=false);

// TOUCH
let touch = {x:0,y:0,active:false};

window.addEventListener("touchmove", e=>{
  touch.active = true;
  touch.x = e.touches[0].clientX;
  touch.y = e.touches[0].clientY;
});

window.addEventListener("touchend", ()=>touch.active=false);

// ===== ENEMY =====
let enemies = [];

function spawnEnemy(){
  const geo = new THREE.BoxGeometry(1,1,1);
  const mat = new THREE.MeshStandardMaterial({color:0xff0000});
  const e = new THREE.Mesh(geo,mat);

  e.position.set(
    Math.random()*10,
    0.5,
    Math.random()*10
  );

  scene.add(e);
  enemies.push(e);
}

// ===== SHOOT =====
document.addEventListener("click", shoot);
window.addEventListener("touchstart", shoot);

function shoot(){
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(0,0), camera);

  const hits = raycaster.intersectObjects(enemies);

  if(hits.length > 0){
    scene.remove(hits[0].object);
    enemies = enemies.filter(e=>e!==hits[0].object);
  }
}

// ===== UPDATE =====
function update(){

  let speed = 0.1;

  if(keys["w"]) camera.position.z -= speed;
  if(keys["s"]) camera.position.z += speed;
  if(keys["a"]) camera.position.x -= speed;
  if(keys["d"]) camera.position.x += speed;

  if(touch.active){
    camera.position.x += (touch.x/window.innerWidth - 0.5)*speed*5;
    camera.position.z += (touch.y/window.innerHeight - 0.5)*speed*5;
  }

  // ENEMY MOVE
  enemies.forEach(e=>{
    e.position.x += (camera.position.x - e.position.x)*0.01;
    e.position.z += (camera.position.z - e.position.z)*0.01;
  });

  if(Math.random()<0.02) spawnEnemy();
}

// ===== LOOP =====
function loop(){
  update();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

loop();

// ===== RESIZE =====
window.addEventListener("resize", ()=>{
  camera.aspect = window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});