// 3D の地球儀（CesiumJS）の共通部品（Day06・07・10・17・25 で使う）
// - Cesium ion（トークンが要るサービス）を使わない。地図は CesiumJS に同梱の Natural Earth II（パブリックドメイン）
// - たくさんの点を、毎フレーム位置を変えながら描く PointCloud
import * as Cesium from "cesium";

export { Cesium };

export interface GlobeOptions {
  /** 夜側を暗くする（太陽の位置に合わせた明暗） */
  lighting?: boolean;
}

export async function createGlobe(container: HTMLElement, { lighting = true }: GlobeOptions = {}): Promise<Cesium.Viewer> {
  // ion を使わないので、既定のトークンの警告を出さない
  Cesium.Ion.defaultAccessToken = "";
  const imagery = await Cesium.TileMapServiceImageryProvider.fromUrl(Cesium.buildModuleUrl("Assets/Textures/NaturalEarthII"));
  const viewer = new Cesium.Viewer(container, {
    baseLayer: new Cesium.ImageryLayer(imagery),
    baseLayerPicker: false,
    geocoder: false,
    homeButton: true,
    sceneModePicker: false,
    navigationHelpButton: false,
    animation: false,
    timeline: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    requestRenderMode: false,
  });
  viewer.scene.globe.enableLighting = lighting;
  viewer.scene.globe.showGroundAtmosphere = true;
  if (viewer.scene.skyAtmosphere) viewer.scene.skyAtmosphere.show = true;
  // 衛星（高さ 3万6千km の静止軌道まで）が収まる距離から見る
  viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(139.7, 25, 6.0e7) });
  viewer.scene.screenSpaceCameraController.maximumZoomDistance = 2.0e8;
  return viewer;
}

/**
 * 位置が毎フレーム変わる、たくさんの点。位置は地球に固定した座標（ECEF）の km で渡す。
 * NaN の点と、show=false の点は描かない。
 */
export class PointCloud {
  readonly collection: Cesium.PointPrimitiveCollection;
  private points: Cesium.PointPrimitive[] = [];
  private scratch = new Cesium.Cartesian3();

  constructor(viewer: Cesium.Viewer, count: number, colors: (i: number) => Cesium.Color, pixelSize = 3) {
    this.collection = viewer.scene.primitives.add(new Cesium.PointPrimitiveCollection({ blendOption: Cesium.BlendOption.OPAQUE }));
    for (let i = 0; i < count; i++) {
      this.points.push(
        this.collection.add({ id: i, position: Cesium.Cartesian3.ZERO, color: colors(i), pixelSize, show: false }),
      );
    }
  }

  get length() {
    return this.points.length;
  }

  /** positions: [x0, y0, z0, x1, ...]（km）、visible: 表示するか */
  update(positions: ArrayLike<number>, visible: (i: number) => boolean) {
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const x = positions[i * 3];
      const show = visible(i) && !Number.isNaN(x);
      if (p.show !== show) p.show = show;
      if (!show) continue;
      this.scratch.x = x * 1000;
      this.scratch.y = positions[i * 3 + 1] * 1000;
      this.scratch.z = positions[i * 3 + 2] * 1000;
      p.position = this.scratch;
    }
  }

  setStyle(i: number, color: Cesium.Color, pixelSize: number) {
    const p = this.points[i];
    p.color = color;
    p.pixelSize = pixelSize;
  }

  destroy(viewer: Cesium.Viewer) {
    viewer.scene.primitives.remove(this.collection);
  }
}
