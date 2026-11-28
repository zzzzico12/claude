// 3D で、小惑星と身近な物を同じ縮尺（1 単位 = 1 m）で並べる
// - 物のモデルは public/models/*.glb（Poly Pizza の CC BY・CC0、NASA のベンヌ）。ないときは簡単な形で代わりに描く
// - モデルは、Wikidata の高さ（または全長）に合わせて大きさをそろえる
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { CSS2DObject, CSS2DRenderer } from "three/addons/renderers/CSS2DRenderer.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export interface ModelDef {
  file: string;
  /** 大きさをそろえる向き：height は高さ、length は水平のいちばん長い向き、diameter はいちばん長い向き */
  measure: "height" | "length" | "diameter";
  /** モデルがないときの代わりの形 */
  fallback: "tower" | "pyramid" | "mountain" | "long" | "person" | "rock";
  /** クレジット。Poly Pizza のものは、Poly Pizza が求める形「<作品> by <作者> [CC-BY] via Poly Pizza」で出す */
  credit?: { title: string; author: string; url: string; license: "CC-BY" | "CC0" | "NASA"; via?: "Poly Pizza" };
}

/** Wikidata の QID → モデル（README の「3D モデル」の表と同じ） */
export const MODELS: Record<string, ModelDef> = {
  Q42196: { file: "whale.glb", measure: "length", fallback: "long", credit: { title: "Whale", author: "sirkitree", url: "https://poly.pizza/m/fo1MBzTFRZ3", license: "CC-BY", via: "Poly Pizza" } },
  Q41225: { file: "bigben.glb", measure: "height", fallback: "tower", credit: { title: "BigBen", author: "Daqian Dong", url: "https://poly.pizza/m/8PaQZ_nLFIQ", license: "CC-BY", via: "Poly Pizza" } },
  Q37200: { file: "pyramid.glb", measure: "height", fallback: "pyramid", credit: { title: "Pyramid", author: "Poly by Google", url: "https://poly.pizza/m/c-tEGK9e49p", license: "CC-BY", via: "Poly Pizza" } },
  Q25173: { file: "titanic.glb", measure: "length", fallback: "long", credit: { title: "Titanic", author: "LEDEGENERE", url: "https://poly.pizza/m/2vKA7JD0JU", license: "CC-BY", via: "Poly Pizza" } },
  Q243: { file: "eiffel.glb", measure: "height", fallback: "tower", credit: { title: "SM - EIffel Tower", author: "Scott Marshall", url: "https://poly.pizza/m/aIpJchqtRTg", license: "CC-BY", via: "Poly Pizza" } },
  Q183536: { file: "tokyotower.glb", measure: "height", fallback: "tower", credit: { title: "東京タワー", author: "Kenta Imai", url: "https://poly.pizza/m/frPqTFGeRNM", license: "CC-BY", via: "Poly Pizza" } },
  Q44440: { file: "goldengate.glb", measure: "length", fallback: "long", credit: { title: "Golden Gate bridge", author: "Steren Giannini", url: "https://poly.pizza/m/a648BwpXx-A", license: "CC-BY", via: "Poly Pizza" } },
  Q39231: { file: "fuji.glb", measure: "height", fallback: "mountain", credit: { title: "Mount Fuji", author: "sugamo", url: "https://poly.pizza/m/2sPka6T7BqR", license: "CC-BY", via: "Poly Pizza" } },
};
export const PERSON_MODEL: ModelDef = { file: "person.fbx", measure: "height", fallback: "person", credit: { title: "Man", author: "Quaternius", url: "https://poly.pizza/m/HMnuH5geEG", license: "CC0", via: "Poly Pizza" } };
export const ASTEROID_MODEL: ModelDef = { file: "bennu.glb", measure: "diameter", fallback: "rock", credit: { title: "Bennu 3D Model", author: "NASA Visualization Technology Applications and Development (VTAD)", url: "https://science.nasa.gov/resource/bennu-3d-model", license: "NASA" } };

const loader = new GLTFLoader();
const fbx = new FBXLoader();
const cache = new Map<string, Promise<THREE.Object3D | null>>();

/** モデルを読み込む（なければ null）。同じファイルは1回だけ読む */
function loadModel(file: string): Promise<THREE.Object3D | null> {
  if (!cache.has(file))
    cache.set(
      file,
      // 人のモデルは Poly Pizza で FBX 形式のものを使う（GLB と同じように読む）
      (file.endsWith(".fbx") ? fbx.loadAsync(`/models/${file}`) : loader.loadAsync(`/models/${file}`).then((g) => g.scene as THREE.Object3D))
        .then((o) => {
          // モデルに入っている照明・カメラは使わない（タイタニックのモデルの照明で、場面が真っ白に飛んだ）
          const extra: THREE.Object3D[] = [];
          o.traverse((c) => {
            if ((c as THREE.Light).isLight || (c as THREE.Camera).isCamera) extra.push(c);
          });
          for (const c of extra) c.removeFromParent();
          bakeSkinned(o);
          if (file.endsWith(".fbx")) {
            // FBX の書き出しで透明度が逆に入り、不透明度 0（透明）になっていた人のモデルを、不透明に直す
            o.traverse((c) => {
              for (const mt of [(c as THREE.Mesh).material ?? []].flat() as THREE.Material[]) {
                mt.opacity = 1;
                mt.transparent = false;
                // 形を直したときに面の向きが裏返ることがあるので、両面を描く
                mt.side = THREE.DoubleSide;
              }
            });
          }
          return o;
        })
        .catch(() => null),
    );
  return cache.get(file)!.then((o) => (o ? o.clone(true) : null));
}

function fallbackShape(kind: ModelDef["fallback"]): THREE.Object3D {
  const mat = new THREE.MeshStandardMaterial({ color: kind === "rock" ? 0x6b5a4c : kind === "mountain" ? 0x7c8a6a : 0x9aa3b2, roughness: 0.9, flatShading: true });
  let g: THREE.BufferGeometry;
  switch (kind) {
    case "tower":
      g = new THREE.CylinderGeometry(0.06, 0.5, 1, 4);
      break;
    case "pyramid":
      g = new THREE.ConeGeometry(0.8, 1, 4);
      break;
    case "mountain":
      g = new THREE.ConeGeometry(4, 1, 24);
      break;
    case "long":
      g = new THREE.BoxGeometry(1, 0.12, 0.14);
      break;
    case "person":
      g = new THREE.CapsuleGeometry(0.18, 0.64, 4, 8);
      break;
    default: {
      // でこぼこの岩（ベンヌのモデルがないとき）
      g = new THREE.IcosahedronGeometry(0.5, 3);
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(p, i);
        v.multiplyScalar(1 + 0.08 * Math.sin(v.x * 9) * Math.cos(v.y * 7));
        p.setXYZ(i, v.x, v.y, v.z);
      }
      g.computeVertexNormals();
    }
  }
  const m = new THREE.Mesh(g, mat);
  m.position.y = 0.5;
  const grp = new THREE.Group();
  grp.add(m);
  return grp;
}

/**
 * 物を、実際の大きさ（m）にそろえ、底を地面（y=0）に、水平の中心を原点に置いた Group にする
 * length のときは、いちばん長い向きを x にそろえる
 */
/**
 * 骨格つきのモデル（人の FBX）を、今の姿勢のまま動かない形に直す。
 * 骨格つきのままだと、拡大・縮小しても骨格の変形で元の大きさ（483 単位）のまま描かれ、巨大な人の影が落ちた
 */
function bakeSkinned(root: THREE.Object3D) {
  root.updateMatrixWorld(true);
  const skinned: THREE.SkinnedMesh[] = [];
  root.traverse((c) => {
    if ((c as THREE.SkinnedMesh).isSkinnedMesh) skinned.push(c as THREE.SkinnedMesh);
  });
  for (const m of skinned) {
    m.skeleton.update();
    const g = m.geometry.clone();
    const pos = g.getAttribute("position") as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    // 骨格で変形したあとの頂点（メッシュのローカル座標）
    for (let i = 0; i < pos.count; i++) pos.setXYZ(i, ...m.getVertexPosition(i, v).toArray());
    g.deleteAttribute("skinIndex");
    g.deleteAttribute("skinWeight");
    g.computeVertexNormals();
    // 写した形には元の（巨大な）外枠が残っているので、作り直す。残したままだと画面の外とみなされて描かれなかった
    g.computeBoundingBox();
    g.computeBoundingSphere();
    const mesh = new THREE.Mesh(g, m.material);
    mesh.position.copy(m.position);
    mesh.quaternion.copy(m.quaternion);
    mesh.scale.copy(m.scale);
    m.parent!.add(mesh);
    m.removeFromParent();
  }
}

function boxOf(o: THREE.Object3D): THREE.Box3 {
  o.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(o);
}

function normalize(obj: THREE.Object3D, def: ModelDef, meters: number): THREE.Group {
  const inner = new THREE.Group();
  inner.add(obj);
  let box = boxOf(inner);
  let size = box.getSize(new THREE.Vector3());
  if (def.measure === "length" && size.z > size.x) {
    obj.rotation.y += Math.PI / 2;
    box = boxOf(inner);
    size = box.getSize(new THREE.Vector3());
  }
  const base = def.measure === "height" ? size.y : def.measure === "length" ? Math.max(size.x, size.z) : Math.max(size.x, size.y, size.z);
  inner.scale.setScalar(meters / (base || 1));
  box = boxOf(inner);
  const c = box.getCenter(new THREE.Vector3());
  inner.position.set(-c.x, -box.min.y, -c.z);
  inner.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const outer = new THREE.Group();
  outer.add(inner);
  return outer;
}

function label(text: string, sub: string, cls = ""): CSS2DObject {
  const div = document.createElement("div");
  div.className = `s-label ${cls}`;
  div.innerHTML = `<b></b><span></span>`;
  div.querySelector("b")!.textContent = text;
  div.querySelector("span")!.textContent = sub;
  return new CSS2DObject(div);
}

export interface SceneInput {
  asteroid: { name: string; min: number; max: number };
  compare: { qid: string; name: string; sub: string; value: number } | null;
  person: { name: string; sub: string };
}

export class CompareScene {
  private renderer: THREE.WebGLRenderer;
  private labels = new CSS2DRenderer();
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1e7);
  private controls: OrbitControls;
  private sun = new THREE.DirectionalLight(0xffffff, 2.2);
  private ground: THREE.Mesh;
  private grid: THREE.GridHelper | null = null;
  private content = new THREE.Group();
  private asteroid: THREE.Group | null = null;
  private asteroidLabel: CSS2DObject | null = null;
  private input: SceneInput | null = null;
  private size = 0;
  private positions = { asteroid: new THREE.Vector3(), person: new THREE.Vector3(), compare: new THREE.Vector3() };
  private token = 0;
  onAsteroidLabel: (meters: number) => string = (m) => `${Math.round(m)} m`;

  constructor(private el: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(this.renderer.domElement);
    this.labels.domElement.className = "s-labels";
    el.appendChild(this.labels.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2 - 0.02;

    // 空（上が青く、地平線が白っぽい）
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(1, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: "varying vec3 p; void main(){ p = normalize(position); vec4 v = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * v; gl_Position.z = gl_Position.w; }",
        fragmentShader: "varying vec3 p; void main(){ float h = max(p.y, 0.0); vec3 c = mix(vec3(0.86,0.91,0.96), vec3(0.35,0.58,0.86), pow(h, 0.6)); gl_FragColor = vec4(c, 1.0); }",
      }),
    );
    sky.scale.setScalar(5e6);
    sky.frustumCulled = false;
    this.scene.add(sky);
    this.scene.add(new THREE.HemisphereLight(0xdfefff, 0x6f7a5a, 1.1));
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.scene.add(this.sun, this.sun.target);
    this.ground = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshStandardMaterial({ color: 0x9fb48a, roughness: 1 }));
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground, this.content);

    new ResizeObserver(() => this.resize()).observe(el);
    this.resize();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  /** 小惑星と比べる物を並べ直す */
  async set(input: SceneInput, asteroidMeters = input.asteroid.max) {
    const my = ++this.token;
    this.input = input;
    const [astObj, cmpObj, personObj] = await Promise.all([
      loadModel(ASTEROID_MODEL.file),
      input.compare ? loadModel(MODELS[input.compare.qid]?.file ?? "") : Promise.resolve(null),
      loadModel(PERSON_MODEL.file),
    ]);
    if (my !== this.token) return; // 読み込みのあいだに別のものが選ばれた
    // ラベル（HTML）は、親ごと場面から外しても画面に残るので、先に消す（切り替えるたびにラベルが重なっていた）
    this.content.traverse((o) => {
      if (o instanceof CSS2DObject) o.element.remove();
    });
    this.content.clear();

    // 小惑星（大きさはスライダーで変える。最初は推定の最大）
    this.asteroid = normalize(astObj ?? fallbackShape("rock"), ASTEROID_MODEL, 1);
    this.content.add(this.asteroid);
    this.asteroidLabel = label(input.asteroid.name, "", "ast");
    this.content.add(this.asteroidLabel);

    // 比べる物
    let cmp: THREE.Group | null = null;
    let cmpWidth = 0;
    if (input.compare) {
      const def = MODELS[input.compare.qid];
      cmp = normalize(cmpObj ?? fallbackShape(def?.fallback ?? "tower"), def ?? { file: "", measure: "height", fallback: "tower" }, input.compare.value);
      const b = boxOf(cmp).getSize(new THREE.Vector3());
      cmpWidth = Math.max(b.x, b.z);
      this.content.add(cmp);
      const l = label(input.compare.name, input.compare.sub);
      l.position.set(0, b.y * 1.04, 0);
      cmp.add(l);
    }
    // 人（身長 1.7 m）
    const person = normalize(personObj ?? fallbackShape("person"), PERSON_MODEL, 1.7);

    this.content.add(person);
    const pl = label(input.person.name, input.person.sub, "person");
    pl.position.set(0, 1.9, 0);
    person.add(pl);

    // 並べ方：左に小惑星、右に比べる物、手前に人
    const dMax = input.asteroid.max;
    const gap = Math.max(dMax, cmpWidth, 4) * 0.25;
    this.positions.asteroid.set(-(dMax / 2 + gap / 2), 0, 0);
    this.positions.compare.set(cmpWidth / 2 + gap / 2, 0, 0);
    this.positions.person.set(this.positions.asteroid.x + dMax / 2 + gap * 0.5, 0, Math.max(dMax, cmpWidth) * 0.35 + 2);
    this.asteroid.position.copy(this.positions.asteroid);
    cmp?.position.copy(this.positions.compare);
    person.position.copy(this.positions.person);

    // 地面・影・目盛りを、並べた物の大きさに合わせる
    const span = Math.max(dMax, input.compare?.value ?? 0, cmpWidth, 10);
    this.size = span;
    this.ground.scale.setScalar(span * 40);
    this.sun.position.set(-span * 1.5, span * 3, span * 2);
    this.sun.target.position.set(0, 0, 0);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -span * 2;
    sc.right = sc.top = span * 2;
    sc.near = span * 0.5;
    sc.far = span * 10;
    sc.updateProjectionMatrix();
    if (this.grid) this.scene.remove(this.grid);
    const cell = 10 ** Math.floor(Math.log10(span / 2));
    this.grid = new THREE.GridHelper(cell * 40, 40, 0x6b7a5c, 0x8a9a78);
    (this.grid.material as THREE.Material).transparent = true;
    (this.grid.material as THREE.Material).opacity = 0.35;
    this.grid.position.y = 0.01 * cell;
    this.scene.add(this.grid);
    this.camera.near = span / 2000;
    this.camera.far = span * 400;

    this.setAsteroidSize(asteroidMeters);
    this.view("overview");
    return cell;
  }

  /** 小惑星の大きさ（m）を変える（推定の最小〜最大のあいだ） */
  setAsteroidSize(m: number) {
    if (!this.asteroid || !this.input) return;
    this.asteroid.scale.setScalar(m);
    // 地面に置く（モデルは底が y=0 になるようにしてあるので、拡大してもそのまま）
    this.asteroidLabel!.position.set(this.positions.asteroid.x, m * 1.04, 0);
    const el = this.asteroidLabel!.element.querySelector("span")!;
    el.textContent = this.onAsteroidLabel(m);
  }

  /** 比べる物が小惑星よりずっと小さく、全体を写すと点にしか見えないとき（8分の1未満）は、比べる物に寄る */
  suggestedView(): "overview" | "object" {
    if (!this.input?.compare) return "overview";
    return this.input.compare.value * 8 < this.input.asteroid.max ? "object" : "overview";
  }

  /** overview：全体が入る斜めの視点。object：比べる物に寄り、うしろに小惑星。human：人の目の高さから見上げる */
  view(v: "overview" | "human" | "object") {
    if (!this.input) return;
    const c = this.controls;
    const span = this.size;
    // 見上げるときは、カメラが見る点より低くてよい（ほかの視点では地面の下に回り込まないよう、見る点より下に行かない）
    c.maxPolarAngle = v === "human" ? Math.PI - 0.05 : Math.PI / 2 - 0.02;
    if (v === "overview") {
      this.camera.fov = 40;
      const h = Math.max(this.input.asteroid.max, this.input.compare?.value ?? 0);
      const dist = (span * 1.2) / Math.tan((this.camera.fov * Math.PI) / 360);
      c.target.set(0, h * 0.4, 0);
      this.camera.position.set(-dist * 0.2, h * 0.5 + dist * 0.25, dist);
      c.minDistance = 0.5;
      c.maxDistance = dist * 6;
    } else if (v === "object" && this.input.compare) {
      // 比べる物の手前（小惑星と反対側の斜め前）から見る。うしろに小惑星がそびえる
      this.camera.fov = 50;
      const o = this.positions.compare;
      const a = this.positions.asteroid;
      const h = this.input.compare.value;
      const d = Math.max(h, 2) * 2.6;
      // 小惑星が比べる物のちょうどうしろに来るように、小惑星と反対の向きから見る
      const away = new THREE.Vector3(o.x - a.x, 0, o.z - a.z).normalize();
      this.camera.position.set(o.x + away.x * d, Math.max(h * 0.45, 1.6), o.z + away.z * d + d * 0.35);
      c.target.set(o.x - away.x * h * 0.6, h * 0.7, o.z);
      c.minDistance = 0.5;
      c.maxDistance = this.size * 6;
    } else {
      // 人の肩ごしに（少しうしろ・横、目の高さより少し上から）小惑星を見上げる。人も画面に入るように
      this.camera.fov = 75;
      const p = this.positions.person;
      const a = this.positions.asteroid;
      const dir = new THREE.Vector3(a.x - p.x, 0, a.z - p.z).normalize();
      const side = new THREE.Vector3(-dir.z, 0, dir.x);
      this.camera.position.set(p.x - dir.x * 3.6 + side.x * 1.1, 1.9, p.z - dir.z * 3.6 + side.z * 1.1);
      // 見上げる角度は 12° まで（それ以上だと、手前の人が画面から外れる。大きな小惑星は上が切れるが、そのほうが大きさが伝わる）
      const cam = this.camera.position;
      const D = Math.hypot(a.x - cam.x, a.z - cam.z);
      c.target.set(a.x, Math.min(this.input.asteroid.max * 0.5, cam.y + D * Math.tan((12 * Math.PI) / 180)), a.z);
    }
    this.camera.updateProjectionMatrix();
    c.update();
  }

  private resize() {
    const w = this.el.clientWidth,
      h = this.el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.labels.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private frame() {
    if (this.asteroid) this.asteroid.children[0].rotation.y += 0.002;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labels.render(this.scene, this.camera);
  }
}
