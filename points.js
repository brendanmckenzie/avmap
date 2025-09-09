window.avmap = window.avmap || {};

window.avmap.airfieldsRaw = {
  YBDG: [1441947, -364422],
  YBLT: [1434728, -373042],
  YBSS: [1442520, -374400],
  YDRN: [1454946, -381232],
  YLEG: [1455135, -382944],
  YLTV: [1462813, -381226],
  YMAV: [1442810, -380222],
  YMBU: [1434232, -370159],
  YMEN: [1445407, -374341],
  YMFD: [1460700, -370400],
  YMMB: [1450608, -375833],
  YMNG: [1451103, -365318],
  YOLA: [1434047, -381711],
  YSHT: [1452333, -362544],
  YSTA: [1431109, -363812],
  YTDN: [1452525, -381256],
  YWBL: [1422648, -381743],
  YYRM: [1464516, -383403],
};

window.avmap.vfrWaypointsRaw = {
  APL: [1445830, -375210],
  BMP: [1442620, -374030],
  CARE: [1452500, -375730],
  CARR: [1450710, -380427],
  GMH: [1451420, -380030],
  KIM: [1445715, -371800],
  KTN: [1442730, -371450],
  MHT: [1445900, -381900],
  PIPS: [1443800, -381736],
  SGSV: [1451800, -374030],
  TON: [1444519, -375119],
  WBER: [1443830, -375400],
  WMS: [1445440, -375210],
};

window.avmap.knownPointsRaw = {
  ...window.avmap.airfieldsRaw,
  ...window.avmap.vfrWaypointsRaw,
};

function dmsToDecimal(input) {
  // Store the sign of the input
  const sign = input < 0 ? -1 : 1;
  const absInput = Math.abs(input);
  const dm = absInput / 100;
  const seconds = absInput % 100;
  const degrees = Math.floor(dm / 100);
  const minutes = Math.floor(dm % 100);

  // Calculate the decimal value from the absolute numbers
  const decimalValue = degrees + minutes / 60 + seconds / 3600;

  // Apply the sign to the final decimal value
  return sign * decimalValue;
}

window.avmap.dmsToDecimal = dmsToDecimal;

function dmsPointsToDecimal(input) {
  return Object.fromEntries(
    Object.entries(input).map(([k, [lon, lat]]) => [
      k,
      [dmsToDecimal(lon), dmsToDecimal(lat)],
    ])
  );
}

window.avmap.airfields = dmsPointsToDecimal(window.avmap.airfieldsRaw);
window.avmap.vfrWaypoints = dmsPointsToDecimal(window.avmap.vfrWaypointsRaw);
window.avmap.knownPoints = dmsPointsToDecimal(window.avmap.knownPointsRaw);
