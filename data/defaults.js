export const SCHEMA_VERSION = 2;

export const CORE_WISH_TEXT = '希望有一天能不在异地 并且我们越来越好';

export const CITY_COORDS = {
  北京: [116.4074, 39.9042],
  连云港: [119.2216, 34.5967],
  枣庄: [117.3237, 34.8105],
  济南: [117.1201, 36.6512],
  徐州: [117.2841, 34.2058],
  淄博: [118.0549, 36.8135]
};

export const DEFAULT_STATE = {
  schemaVersion: SCHEMA_VERSION,
  updatedAt: '2026-11-24T00:00:00.000Z',
  couple: {
    startDate: '2026-08-08T00:00:00',
    passcode: '0808',
    partners: {
      beijing: {
        id: 'beijing',
        name: '许金阳',
        nickname: '小狗',
        city: '北京',
        coords: [116.4074, 39.9042],
        role: '在读研究生 · 实验室',
        birthday: '',
        avatar: './images/avatar-xjy.webp',
        tags: ['北京', '实验室', '小狗'],
        motto: '从北京出发的每一班高铁，终点都是你。'
      },
      lyg: {
        id: 'lyg',
        name: '渐姝君',
        nickname: '小猪',
        city: '连云港',
        coords: [119.2216, 34.5967],
        role: '在读研究生 · 课题组',
        birthday: '',
        avatar: './images/avatar-jsj.webp',
        tags: ['连云港', '海风', '小猪'],
        motto: '吹过连云港的海风，也想和你一起看尽四季。'
      }
    }
  },
  settings: {
    lockOnOpen: false
  },
  nextMeet: {
    date: '2026-12-25',
    city: '淄博 / 待定',
    note: '冬日约会计划中'
  },
  milestones: [
    {
      id: 'm1',
      date: '2026.08.08',
      city: '枣庄',
      title: '夏末初遇',
      note: '小狗和小猪第一次在枣庄相聚，双城故事从这一天正式写下第一行。',
      tags: ['初遇', '纪念日']
    },
    {
      id: 'm2',
      date: '2026.09',
      city: '济南',
      title: '泉城重逢',
      note: '初秋在泉水与老街巷里慢慢散步，把攒了整月的想念折进晚风里。',
      tags: ['重逢', '济南']
    },
    {
      id: 'm3',
      date: '2026.10',
      city: '连云港',
      title: '奔赴山海',
      note: '许金阳来到渐姝君读书的城市，吹了她日常吹过的海风，走了她走过的路。',
      tags: ['海风', '连云港']
    },
    {
      id: 'm4',
      date: '2026.11.01',
      city: '徐州',
      title: '彭城交汇',
      note: '在京沪线与徐连线的交汇点重逢，看晚秋日落，吃热气腾腾的烟火味道。',
      tags: ['晚秋', '徐州']
    }
  ],
  tickets: [
    {
      id: 't1',
      date: '2026.08.08 – 08.09',
      code: 'ZZG',
      route: '北京 / 连云港 → 枣庄',
      fromCity: '北京',
      toCity: '枣庄',
      coords: [117.3237, 34.8105],
      distanceKm: 620,
      subtitle: '初遇 · 去了小猪家那边',
      desc: '第一次奔赴，夏末的风吹过枣庄，小狗和小猪所有的故事从这一张车票开始。',
      status: '已检票',
      tags: ['初遇', '枣庄']
    },
    {
      id: 't2',
      date: '2026.09',
      code: 'TNA',
      route: '双城专列 → 济南',
      fromCity: '北京',
      toCity: '济南',
      coords: [117.1201, 36.6512],
      distanceKm: 410,
      subtitle: '泉城重逢',
      desc: '初秋的济南，在泉水与老街巷里慢慢走，把想念折进晚风里。',
      status: '已检票',
      tags: ['重逢', '济南']
    },
    {
      id: 't3',
      date: '2026.10',
      code: 'LYG',
      route: '北京 → 连云港',
      fromCity: '北京',
      toCity: '连云港',
      coords: [119.2216, 34.5967],
      distanceKm: 745,
      subtitle: '奔赴山海',
      desc: '来到小猪读书的城市，吹了她日常吹过的海风，走了她每天走过的路。',
      status: '已检票',
      tags: ['山海', '连云港']
    },
    {
      id: 't4',
      date: '2026.11.01',
      code: 'XUZ',
      route: '京沪 / 徐连 → 徐州',
      fromCity: '北京',
      toCity: '徐州',
      coords: [117.2841, 34.2058],
      distanceKm: 690,
      subtitle: '彭城交汇',
      desc: '在京沪与徐连的交汇点重逢，看晚秋日落，吃热气腾腾的烟火味道。',
      status: '已检票',
      tags: ['交汇', '徐州']
    },
    {
      id: 't5',
      date: '2026.12',
      code: 'TBD',
      route: '双城 → 下一站',
      fromCity: '北京',
      toCity: '淄博',
      coords: [118.0549, 36.8135],
      distanceKm: 470,
      subtitle: '冬日筹备中',
      desc: '也许是淄博的琉璃夜色，或是任何有你的地方——只要目的地写着你的名字。',
      status: '待出票',
      tags: ['计划中', '冬日']
    }
  ],
  photos: [
    {
      id: 'p0',
      city: '枣庄',
      date: '2026.08.08',
      title: '双子塔夜色 · 枣庄',
      path: './images/01_zaozhuang_twin_towers.webp',
      caption: '2026.08.08 · 第一次在枣庄约会，双子塔灯火与桥栏上并肩的两个影子',
      tags: ['枣庄', '初遇', '夜景'],
      gradient: 'linear-gradient(135deg, #371a00, #1a0c00)',
      presetMeta: '35mm · f/2.0 · ISO 800 · Zaozhuang'
    },
    {
      id: 'p1',
      city: '济南',
      date: '2026.09',
      title: '趵突泉重逢 · 济南',
      path: './images/01_jinan_baotuquan.webp',
      caption: '2026.09 · 济南第一泉旁相视而笑的小狗与小猪',
      tags: ['济南', '趵突泉', '合影'],
      gradient: 'linear-gradient(135deg, #2b1f1d, #140d0c)',
      presetMeta: '35mm · f/2.0 · ISO 200 · Jinan'
    },
    {
      id: 'p2',
      city: '连云港',
      date: '2026.10',
      title: '海岸晚风 · 连云港',
      path: './images/02_lianyungang_sea.webp',
      caption: '2026.10 · 连云港的落日海风与温柔的小猪',
      tags: ['连云港', '海边', '渐姝君'],
      gradient: 'linear-gradient(135deg, #0f2027, #203a43)',
      presetMeta: '35mm · f/1.8 · ISO 100 · Lianyungang'
    },
    {
      id: 'p3',
      city: '连云港',
      date: '2026.10',
      title: '夜晚校园 · 连云港',
      path: './images/03_lianyungang_campus.webp',
      caption: '2026.10 · 来到小猪读书的校园，夜色里的并肩合影',
      tags: ['连云港', '校园', '合影'],
      gradient: 'linear-gradient(135deg, #111827, #090d16)',
      presetMeta: '35mm · f/1.4 · ISO 800 · Lianyungang'
    },
    {
      id: 'p4',
      city: '连云港',
      date: '2026.10.05',
      title: '手腕画心 · 我爱你',
      path: './images/04_lianyungang_heart.webp',
      caption: '2026.10.05 · 听着卢广仲《我爱你》，认真在手腕画下一颗心',
      tags: ['连云港', '日常', '心动'],
      gradient: 'linear-gradient(135deg, #2c1e16, #140d0a)',
      presetMeta: '35mm · f/2.0 · ISO 400 · Lianyungang'
    },
    {
      id: 'p5',
      city: '连云港',
      date: '2026.10.05',
      title: '小太阳与粉红爱心',
      path: './images/05_lianyungang_sun_heart.webp',
      caption: '2026.10.05 · 手腕上的太阳与爱心，把温暖随身带着走',
      tags: ['连云港', '细节', '浪漫'],
      gradient: 'linear-gradient(135deg, #27221f, #141210)',
      presetMeta: '35mm · f/2.2 · ISO 200 · Lianyungang'
    },
    {
      id: 'p7',
      city: '徐州',
      date: '2026.11.01',
      title: '电梯合影 · 重逢瞬间',
      path: './images/07_reunion_elevator.webp',
      caption: '2026.11.01 · 跨越几百公里重逢，最贪恋靠在一起的每一秒',
      tags: ['徐州', '合影', '日常'],
      gradient: 'linear-gradient(135deg, #2b2118, #140f0b)',
      presetMeta: '35mm · f/1.8 · ISO 400 · Reunion'
    }
  ],
  wishes: [
    {
      id: 'w0',
      text: CORE_WISH_TEXT,
      done: false,
      pinned: true,
      author: 'both',
      createdAt: '2026-08-08',
      doneAt: null,
      tags: ['核心心愿', '未来']
    },
    {
      id: 'w1',
      text: '攒满十张往返彼此城市的高铁票根',
      done: false,
      pinned: false,
      author: 'both',
      createdAt: '2026-08-08',
      doneAt: null,
      tags: ['车票']
    },
    {
      id: 'w2',
      text: '一起在海边或湖畔看一次完整的橘子海日落',
      done: true,
      pinned: false,
      author: 'both',
      createdAt: '2026-08-08',
      doneAt: '2026-10-05',
      tags: ['海边']
    },
    {
      id: 'w3',
      text: '各自顺利完成论文与目标后开启一场不看返程票的旅行',
      done: false,
      pinned: false,
      author: 'both',
      createdAt: '2026-09-10',
      doneAt: null,
      tags: ['研途', '旅行']
    },
    {
      id: 'w4',
      text: '拍一套属于小狗和小猪的胶片写真',
      done: false,
      pinned: false,
      author: 'both',
      createdAt: '2026-10-01',
      doneAt: null,
      tags: ['摄影']
    },
    {
      id: 'w5',
      text: '去淄博看海岱楼夜景吃一顿热乎烧烤',
      done: false,
      pinned: false,
      author: 'both',
      createdAt: '2026-11-01',
      doneAt: null,
      tags: ['美食']
    },
    {
      id: 'w6',
      text: '在冬夜里一起压一次不赶时间的马路',
      done: true,
      pinned: false,
      author: 'both',
      createdAt: '2026-11-01',
      doneAt: '2026-11-01',
      tags: ['日常']
    }
  ],
  letters: {
    beijing: {
      authorId: 'beijing',
      authorName: '许金阳',
      nickname: '小狗',
      title: '许金阳 · 来自北京（小狗）',
      meta: '寄件人: 许金阳（小狗） · 北京市 · 实验室灯下',
      text: `小猪：\n\n做完今晚最后一组实验与数据整理，实验室里的人差不多都走光了。北京的夜开始降温，走在回去的路上，看着路灯把银杏影子拉得很长，突然就很想你。\n\n科研的压力和重复的日常偶尔让人疲惫，但只要想到下一次就能在高铁站见到渐姝君，心里就多了一块无比安心的锚点。希望有一天我们能不再异地，把现在攒下来的每一公里，都换成往后朝夕相伴的烟火气。\n\n你在连云港好好照顾自己，小狗一直在认真努力，奔向我们的下一站。`,
      updatedAt: '2026-11-24',
      unlockAt: null
    },
    lyg: {
      authorId: 'lyg',
      authorName: '渐姝君',
      nickname: '小猪',
      title: '渐姝君 · 来自连云港（小猪）',
      meta: '寄件人: 渐姝君（小猪） · 连云港市 · 海风吹过时',
      text: `小狗：\n\n今天连云港的海风有点大，从课题组窗口望出去，海面是一片很深沉的蓝。整理完手头文献，又翻出了我们一起走过的那些城市的记录。\n\n虽然北京和连云港隔着七百多公里，但每天听你讲实验室的琐事、一起规划下一张高铁票，就觉得你一直都在身边。读研这几年或许会忙一点，但有许金阳一起并肩，所有的坚持都有了很温柔的意义。\n\n记得按时吃饭，别熬夜太晚。愿我们越来越好，早日结束异地，下一站见！`,
      updatedAt: '2026-11-24',
      unlockAt: null
    }
  }
};
