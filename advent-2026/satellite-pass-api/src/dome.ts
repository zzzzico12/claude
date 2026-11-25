// 空のドーム（three.js）。観測地を中心に半球の空を置き、衛星の通り道を天球に描いて、衛星を動かす
// 座標：y が真上、-z が北、+x が東（上から見ると地図と同じ向き）
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const R = 10; // 空の半径
const DEG = Math.PI / 180;
const MIN_EL = 10; // 「見える」とする高さ

/** [見え始めからの秒, 方位角, 高さ, 見えるなら1] */
export type PathPoint = [number, number, number, 0 | 1];

export interface DomePass {
  path: PathPoint[];
  /** 見え始め・いちばん高いとき・見え終わりの [秒, 方位角, 高さ] と表示する文字 */
  marks: { sec: number; azimuth: number; elevation: number; label: string }[];
}

export interface DomeState {
  sec: number;
  azimuth: number;
  elevation: number;
  visible: boolean;
  playing: boolean;
  span: [number, number];
}

export interface DomeLabels {
  compass: string[]; // 北・北東・東…（8方位）
  ring: (deg: number) => string;
}

function dir(az: number, el: number, r = R): THREE.Vector3 {
  const a = az * DEG;
  const e = el * DEG;
  return new THREE.Vector3(r * Math.cos(e) * Math.sin(a), r * Math.sin(e), -r * Math.cos(e) * Math.cos(a));
}

/** 文字を描いたスプライト（いつも画面のほうを向く） */
function textSprite(text: string, opts: { color?: string; size?: number; weight?: number; bg?: string } = {}): THREE.Sprite {
  const px = 64;
  const font = `${opts.weight ?? 600} ${px}px system-ui, -apple-system, "Hiragino Sans", "Noto Sans JP", sans-serif`;
  const c = document.createElement("canvas");
  const g = c.getContext("2d")!;
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + px * 0.6;
  c.width = w;
  c.height = px * 1.5;
  g.font = font;
  if (opts.bg) {
    g.fillStyle = opts.bg;
    g.beginPath();
    g.roundRect(0, 0, c.width, c.height, px * 0.35);
    g.fill();
  }
  g.fillStyle = opts.color ?? "#e8eefc";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(text, c.width / 2, c.height / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  const h = opts.size ?? 0.7;
  s.scale.set((h * c.width) / c.height, h, 1);
  return s;
}

/** 光る点（衛星） */
function glowTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.12, "rgba(255,246,214,1)");
  grad.addColorStop(0.35, "rgba(255,212,121,0.45)");
  grad.addColorStop(1, "rgba(255,212,121,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function circle(el: number, color: number, opacity: number, dashed = false): THREE.Line {
  const pts: THREE.Vector3[] = [];
  for (let az = 0; az <= 360; az += 3) pts.push(dir(az, el));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, transparent: true, opacity, dashSize: 0.35, gapSize: 0.25 })
    : new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const line = new THREE.Line(geo, mat);
  if (dashed) line.computeLineDistances();
  return line;
}

export class Dome {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1000);
  private controls: OrbitControls;
  private passGroup = new THREE.Group();
  private sat: THREE.Sprite;
  private sight: THREE.Line;
  private drop: THREE.Line;
  private pts: { sec: number; v: THREE.Vector3; visible: boolean }[] = [];
  private sec = 0;
  private playing = true;
  private speed = 30; // 実際の30倍の速さ
  private last = 0;
  private view: "outside" | "inside" = "outside";
  private maxAz = 180;
  private maxEl = 45;
  private glows: THREE.Object3D[] = [];
  onChange: (s: DomeState) => void = () => {};

  constructor(
    private el: HTMLElement,
    labels: DomeLabels,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(this.renderer.domElement);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.enablePan = false;

    this.buildSky(labels);

    this.sat = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.sat.scale.setScalar(1.6);
    this.sight = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.55, 0), new THREE.Vector3()]), new THREE.LineDashedMaterial({ color: 0xffd479, transparent: true, opacity: 0.35, dashSize: 0.25, gapSize: 0.2 }));
    this.drop = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: 0x9fb4d8, transparent: true, opacity: 0.25 }));
    this.scene.add(this.passGroup, this.sat, this.sight, this.drop);

    this.setView("outside");
    new ResizeObserver(() => this.resize()).observe(el);
    this.resize();
    this.playing = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer.setAnimationLoop((t) => this.frame(t));
  }

  private buildSky(labels: DomeLabels) {
    // 背景：地平線が少し明るい夜空
    const bg = new THREE.Mesh(
      new THREE.SphereGeometry(300, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {},
        vertexShader: "varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
        fragmentShader:
          "varying vec3 p; void main(){ float h = clamp(p.y, -1.0, 1.0); vec3 top = vec3(0.012,0.02,0.05); vec3 hor = vec3(0.07,0.11,0.2); vec3 low = vec3(0.02,0.025,0.03); vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.45)) : mix(hor*0.6, low, clamp(-h*4.0,0.0,1.0)); gl_FragColor = vec4(c,1.0); }",
      }),
    );
    this.scene.add(bg);

    // 飾りの星（実際の星の位置ではない）
    const n = 700;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const az = Math.random() * 360;
      const el = Math.asin(Math.random()) / DEG; // 上ほど少なく見えないよう、天球上で一様に
      const v = dir(az, Math.max(2, el), 200);
      pos.set([v.x, v.y, v.z], i * 3);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xcfd8ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0.55, depthWrite: false })));

    // 地面
    const ground = new THREE.Mesh(new THREE.CircleGeometry(R * 1.35, 96), new THREE.MeshBasicMaterial({ color: 0x0b1210 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    this.scene.add(ground);
    const groundRing = circle(0, 0x6f8fb8, 0.7);
    this.scene.add(groundRing);
    for (let az = 0; az < 360; az += 45) {
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), dir(az, 0)]), new THREE.LineBasicMaterial({ color: 0x2c3d33, transparent: true, opacity: 0.9 }));
      this.scene.add(l);
    }

    // 空の半球（うっすら）と、高さの輪・方位の線
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(R, 72, 36, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0x4a78b5, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.scene.add(shell);
    this.scene.add(circle(MIN_EL, 0x8fb3e8, 0.55, true));
    this.scene.add(circle(30, 0x5c7aa6, 0.35));
    this.scene.add(circle(60, 0x5c7aa6, 0.35));
    for (let az = 0; az < 360; az += 45) {
      const pts: THREE.Vector3[] = [];
      for (let e = 0; e <= 90; e += 3) pts.push(dir(az, e));
      this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: az === 0 ? 0x7f9fd0 : 0x4a6288, transparent: true, opacity: az === 0 ? 0.55 : 0.3 })));
    }

    // 方位の文字（地平線の外側）
    labels.compass.forEach((t, i) => {
      const main = i % 2 === 0;
      const s = textSprite(t, { size: main ? 0.95 : 0.6, color: main ? (i === 0 ? "#ff9b8a" : "#e8eefc") : "#9fb0cc", weight: main ? 700 : 500 });
      s.position.copy(dir(i * 45, 0, R * 1.14)).setY(main ? 0.5 : 0.35);
      this.scene.add(s);
    });
    for (const e of [MIN_EL, 30, 60]) {
      const s = textSprite(labels.ring(e), { size: 0.55, color: e === MIN_EL ? "#b9cff0" : "#8ea3c4", weight: 500 });
      s.position.copy(dir(200, e, R * 1.01));
      this.scene.add(s);
    }

    // 観測する人（中心）
    const person = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 0.45, 16), new THREE.MeshBasicMaterial({ color: 0xd8e2f5 }));
    body.position.y = 0.22;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), new THREE.MeshBasicMaterial({ color: 0xd8e2f5 }));
    head.position.y = 0.55;
    person.add(body, head);
    this.scene.add(person);
  }

  /** 通過を差し替える */
  setPass(p: DomePass) {
    for (const c of [...this.passGroup.children]) {
      this.passGroup.remove(c);
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material & { map?: THREE.Texture };
        mat?.map?.dispose();
        mat?.dispose();
      });
    }
    this.glows = [];
    this.pts = p.path.map(([sec, az, el, vis]) => ({ sec, v: dir(az, el), visible: vis === 1 }));
    if (this.pts.length < 2) return;

    // 見える部分（太く光る線）と見えない部分（細い点線）に分けて描く
    let run: typeof this.pts = [];
    const flush = () => {
      if (run.length < 2) return;
      const vis = run[0].visible;
      if (vis) {
        const curve = new THREE.CatmullRomCurve3(run.map((x) => x.v));
        const segs = Math.max(8, run.length * 3);
        this.passGroup.add(new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.06, 8), new THREE.MeshBasicMaterial({ color: 0xffd479 })));
        // 光のにじみ（外から見るときだけ。見上げると近すぎて帯に見える）
        const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, segs, 0.22, 8), new THREE.MeshBasicMaterial({ color: 0xffb347, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
        this.glows.push(glow);
        this.passGroup.add(glow);
      } else {
        const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(run.map((x) => x.v)), new THREE.LineDashedMaterial({ color: 0x8ea3c4, transparent: true, opacity: 0.6, dashSize: 0.2, gapSize: 0.18 }));
        line.computeLineDistances();
        this.passGroup.add(line);
      }
    };
    for (let i = 0; i < this.pts.length; i++) {
      const x = this.pts[i];
      if (run.length && run[run.length - 1].visible !== x.visible) {
        // 境目の点は両方に入れて、線をつなげる
        run.push(x);
        flush();
        run = [run[run.length - 1]];
        continue;
      }
      run.push(x);
    }
    flush();

    // 見え始め・いちばん高いとき・見え終わりの印と文字
    p.marks.forEach((m, i) => {
      const v = dir(m.azimuth, m.elevation);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), new THREE.MeshBasicMaterial({ color: i === 1 ? 0xffffff : 0xffd479 }));
      dot.position.copy(v);
      this.passGroup.add(dot);
      const s = textSprite(m.label, { size: 0.8, color: "#fff7e0", bg: "rgba(10,16,32,0.72)", weight: 600 });
      s.position.copy(v.clone().multiplyScalar(1.0)).add(new THREE.Vector3(0, 0.75, 0));
      this.passGroup.add(s);
    });

    this.maxAz = p.marks[1]?.azimuth ?? 180;
    this.maxEl = p.marks[1]?.elevation ?? 45;
    this.sec = this.pts[0].sec;
    if (!this.playing) this.sec = p.marks[1]?.sec ?? this.sec; // 動かさない設定のときは、いちばん高いときを見せる
    this.setView(this.view);
    this.update();
  }

  get span(): [number, number] {
    return this.pts.length ? [this.pts[0].sec, this.pts[this.pts.length - 1].sec] : [0, 0];
  }

  setPlaying(on: boolean) {
    this.playing = on;
    this.emit();
  }
  togglePlaying() {
    this.setPlaying(!this.playing);
  }
  seek(sec: number) {
    this.sec = sec;
    this.update();
  }

  /** 外から見る／真ん中から見上げる */
  setView(v: "outside" | "inside") {
    this.view = v;
    const c = this.controls;
    if (v === "outside") {
      // 通り道の反対側の、斜め上から見る（通り道が手前のドーム越しに見える）
      // 縦長の画面では、ドームが横に収まるよう遠ざける
      const back = dir(this.maxAz + 180, 24, 33 * Math.max(1, 1.15 / this.camera.aspect));
      this.camera.fov = 42;
      this.camera.position.copy(back);
      c.target.set(0, 3.2, 0);
      c.enableZoom = true;
      c.minDistance = 8;
      c.maxDistance = 60;
      c.minPolarAngle = 0.05;
      c.maxPolarAngle = Math.PI / 2 - 0.02;
      c.rotateSpeed = 0.6;
    } else {
      // 人の目の高さから、いちばん高いときの方向を見上げる。ドラッグで見回す
      const eye = new THREE.Vector3(0, 0.55, 0);
      // 高い通過は真上近くまで入るよう、少し上向きに（ただし地平線も入る高さまで）
      const look = dir(this.maxAz, Math.min(42, Math.max(25, this.maxEl - 20)), 1);
      this.camera.fov = 88;
      c.target.copy(eye).add(look.multiplyScalar(0.01));
      this.camera.position.copy(eye);
      c.enableZoom = false;
      c.minDistance = 0;
      c.maxDistance = Infinity;
      c.minPolarAngle = 0;
      c.maxPolarAngle = Math.PI;
      c.rotateSpeed = -0.35;
    }
    for (const g of this.glows) g.visible = v === "outside";
    this.camera.updateProjectionMatrix();
    c.update();
  }

  private resize() {
    const w = this.el.clientWidth;
    const h = this.el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private at(sec: number): { v: THREE.Vector3; visible: boolean } {
    const p = this.pts;
    if (sec <= p[0].sec) return { v: p[0].v.clone(), visible: p[0].visible };
    for (let i = 1; i < p.length; i++) {
      if (sec <= p[i].sec) {
        const f = (sec - p[i - 1].sec) / (p[i].sec - p[i - 1].sec || 1);
        const v = p[i - 1].v.clone().lerp(p[i].v, f).setLength(R);
        return { v, visible: f < 0.5 ? p[i - 1].visible : p[i].visible };
      }
    }
    const l = p[p.length - 1];
    return { v: l.v.clone(), visible: l.visible };
  }

  private update() {
    if (!this.pts.length) {
      this.sat.visible = this.sight.visible = this.drop.visible = false;
      return;
    }
    const { v, visible } = this.at(this.sec);
    this.sat.visible = this.sight.visible = this.drop.visible = true;
    this.sat.position.copy(v);
    // 影の中や低いときは、暗く小さく
    const m = this.sat.material as THREE.SpriteMaterial;
    m.opacity = visible ? 1 : 0.28;
    this.sat.scale.setScalar(visible ? 1.7 : 0.8);
    (this.sight.material as THREE.LineDashedMaterial).opacity = visible ? 0.45 : 0.12;
    this.sight.geometry.setFromPoints([new THREE.Vector3(0, 0.55, 0), v]);
    this.sight.computeLineDistances();
    this.drop.geometry.setFromPoints([v, new THREE.Vector3(v.x, 0, v.z)]);
    this.emit(v, visible);
  }

  private emit(v = this.sat.position, visible = (this.sat.material as THREE.SpriteMaterial).opacity > 0.5) {
    const el = Math.asin(Math.max(-1, Math.min(1, v.y / R))) / DEG;
    const az = ((Math.atan2(v.x, -v.z) / DEG) + 360) % 360;
    this.onChange({ sec: this.sec, azimuth: az, elevation: el, visible, playing: this.playing, span: this.span });
  }

  private frame(t: number) {
    const dt = this.last ? Math.min(0.1, (t - this.last) / 1000) : 0;
    this.last = t;
    if (this.playing && this.pts.length) {
      const [a, b] = this.span;
      this.sec += dt * this.speed;
      if (this.sec > b) this.sec = a;
      this.update();
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

/** 通り道がない（古い応答の）ときは、3点を通る天球上の曲線で代わりにする */
export function fallbackPath(start: [number, number, number], max: [number, number, number], end: [number, number, number]): PathPoint[] {
  const [s, m, e] = [start, max, end].map(([, az, el]) => dir(az, el));
  const c = m.clone().multiplyScalar(2).sub(s.clone().add(e).multiplyScalar(0.5));
  const out: PathPoint[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const v = s.clone().multiplyScalar((1 - f) ** 2).add(c.clone().multiplyScalar(2 * f * (1 - f))).add(e.clone().multiplyScalar(f * f)).setLength(R);
    const el = Math.asin(v.y / R) / DEG;
    const az = ((Math.atan2(v.x, -v.z) / DEG) + 360) % 360;
    out.push([start[0] + (end[0] - start[0]) * f, az, el, 1]);
  }
  return out;
}
