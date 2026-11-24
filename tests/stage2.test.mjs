import test from 'node:test';
import assert from 'node:assert/strict';

import { createDefaultState } from '../js/schema.js';
import {
  describeWeatherCode,
  generateWeatherTip,
  getSkyMood,
  projectCoord,
  buildBezierArc,
  computeJourneyStats,
  enrichTicketMeta,
  pickDateIdea,
  DATE_IDEAS
} from '../js/utils/stage2-logic.js';

test('describeWeatherCode maps WMO weather codes to concise Chinese label and icon', () => {
  assert.deepEqual(describeWeatherCode(0, true), { label: '晴朗', icon: '☀️' });
  assert.deepEqual(describeWeatherCode(0, false), { label: '晴夜', icon: '🌙' });
  assert.equal(describeWeatherCode(3, true).label, '阴天');
  assert.equal(describeWeatherCode(61, true).label, '小雨');
  assert.equal(describeWeatherCode(73, true).label, '降雪');
});

test('generateWeatherTip highlights large temperature gap or rain between Beijing and Lianyungang', () => {
  const coldGap = generateWeatherTip(
    { temp: 2, weatherCode: 0, windSpeed: 28 },
    { temp: 13, weatherCode: 1, windSpeed: 10 }
  );
  assert.ok(coldGap.includes('北京') && coldGap.includes('连云港'));
  assert.ok(coldGap.includes('11°C') || coldGap.includes('降温') || coldGap.includes('加衣'));

  const rainy = generateWeatherTip(
    { temp: 16, weatherCode: 2, windSpeed: 8 },
    { temp: 15, weatherCode: 63, windSpeed: 12 }
  );
  assert.ok(rainy.includes('伞') || rainy.includes('雨'));
});

test('getSkyMood returns dawn, day, sunset, or night mood metadata for 24h clock', () => {
  assert.equal(getSkyMood(6).id, 'dawn');
  assert.equal(getSkyMood(12).id, 'day');
  assert.equal(getSkyMood(17).id, 'sunset');
  assert.equal(getSkyMood(22).id, 'night');
});

test('projectCoord maps Beijing north-west of Lianyungang inside SVG viewBox bounds', () => {
  const bj = projectCoord([116.4074, 39.9042]);
  const lyg = projectCoord([119.2216, 34.5967]);

  assert.ok(bj.x > 0 && bj.x < 640);
  assert.ok(bj.y > 0 && bj.y < 520);
  assert.ok(lyg.x > bj.x, 'Lianyungang should be east of Beijing');
  assert.ok(lyg.y > bj.y, 'Lianyungang should be south of Beijing');

  const path = buildBezierArc(bj, lyg);
  assert.ok(path.startsWith('M ') && path.includes(' Q '));
});

test('computeJourneyStats aggregates mileage, checked-in tickets, cities, wish rate, and city nodes with photos', () => {
  const state = createDefaultState();
  const stats = computeJourneyStats(state);

  assert.equal(stats.checkedTicketCount, 4);
  assert.equal(stats.totalTickets, 5);
  assert.equal(stats.totalKm, 620 + 410 + 745 + 690);
  assert.equal(stats.unlockedCityCount, 4);
  assert.equal(stats.wishTotal, 7);
  assert.equal(stats.wishDone, 2);
  assert.equal(stats.wishPct, Math.round((2 / 7) * 100));

  const lygNode = stats.cityNodes.find((n) => n.city === '连云港');
  assert.ok(lygNode, 'Lianyungang node must exist');
  assert.equal(lygNode.isHome, true);
  assert.ok(lygNode.photos.length >= 3, 'Lianyungang node should link its real gallery photos');
  assert.ok(lygNode.tickets.length >= 1, 'Lianyungang node should link its ticket');
});

test('enrichTicketMeta provides deterministic Fuxing train number, seat, gate, and blue/pink theme', () => {
  const meta1 = enrichTicketMeta({ id: 't1', code: 'ZZG', route: '北京 → 枣庄' }, 0);
  const meta2 = enrichTicketMeta({ id: 't2', code: 'TNA', route: '北京 → 济南', ticketTheme: 'pink' }, 1);

  assert.ok(/^G\d+/.test(meta1.trainNo));
  assert.ok(meta1.seat.includes('车'));
  assert.equal(meta1.ticketTheme, 'blue');
  assert.equal(meta2.ticketTheme, 'pink');
});

test('pickDateIdea picks an item from DATE_IDEAS and avoids immediate repeat when possible', () => {
  assert.ok(DATE_IDEAS.length >= 8);
  const first = pickDateIdea(DATE_IDEAS, null, () => 0);
  const second = pickDateIdea(DATE_IDEAS, first.id, () => 0);
  assert.notEqual(second.id, first.id);
});
