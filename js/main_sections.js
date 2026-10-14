/* =========================================================
   브이웹 메인 신규 섹션 (vs01 ~ vs05) — GSAP 모션
   gsap / ScrollTrigger / ScrollToPlugin / jQuery 는 index.html 에서 먼저 로드
   · gsap.md      : 기본 이즈 power4.out · position '< N%' 통일 · yPercent ≤ 30
                    섹션당 줄 스플릿 1개 · paused + onEnter(revealAt) · 모바일은 개별 트리거
   · gsap 핀.md   : 핀은 PC 전용 · anticipatePin + refreshPriority · 파일 최하단에서 생성 후 refresh
   ========================================================= */
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

window.addEventListener("load", function () {
  const PC = "(min-width: 600px)";
  const MO = "(max-width: 599px)";
  const REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ANTICIPATE = 0.5;
  const mm = gsap.matchMedia();

  // html { scroll-behavior: smooth } 가 refresh 좌표를 틀어지게 하지 않도록 (핀.md §8-9)
  const docEl = document.documentElement;
  ScrollTrigger.addEventListener("refreshInit", function () { docEl.style.setProperty("scroll-behavior", "auto", "important"); });
  ScrollTrigger.addEventListener("refresh", function () { docEl.style.removeProperty("scroll-behavior"); });

  /* =========================================================
     헬퍼
     ========================================================= */
  // 트리거가 트윈을 소유하지 않는 등장 (gsap.md §7-9) — refresh 때 op0 으로 되감기지 않음
  function revealAt(trigger, build, start) {
    if (REDUCE) return null;
    const t = gsap.timeline({ paused: true, defaults: { duration: 1, ease: "power4.out" } });
    build(t);
    ScrollTrigger.create({ trigger: trigger, start: start || "top 80%", once: true, onEnter: function () { t.play(); } });
    return t;
  }
  // 모바일 — 항목마다 자기 트리거 (gsap.md §6-0)
  function revealEach(sel, vars, start) {
    gsap.utils.toArray(sel).forEach(function (el) {
      revealAt(el, function (t) { t.from(el, Object.assign({ duration: 0.95 }, vars), "< 0%"); }, start || "top 88%");
    });
  }

  // <br> 기준 줄 래핑 — br 은 그대로 두고 그 사이만 inline-block span 으로 (gsap.md §3-17)
  function splitLines(sel) {
    const out = [];
    document.querySelectorAll(sel).forEach(function (el) {
      if (!el.dataset.lines) {
        const frag = document.createDocumentFragment();
        const made = [];
        let g = null;
        [].slice.call(el.childNodes).forEach(function (n) {
          if (n.nodeName === "BR") { g = null; frag.appendChild(n); return; }
          if (!g) { g = document.createElement("span"); g.className = "ln"; frag.appendChild(g); made.push(g); }
          g.appendChild(n);
        });
        made.forEach(function (s) {           // 줄 끝 공백은 span 밖으로
          const last = s.lastChild;
          if (!last || last.nodeType !== 3) return;
          const m = last.nodeValue.match(/\s+$/);
          if (!m || m[0].length === last.nodeValue.length) return;
          last.nodeValue = last.nodeValue.slice(0, -m[0].length);
          s.parentNode.insertBefore(document.createTextNode(m[0]), s.nextSibling);
        });
        el.appendChild(frag);
        el.dataset.lines = "1";
      }
      [].push.apply(out, el.querySelectorAll(".ln"));
    });
    return out.filter(function (s) { return s.textContent.trim(); });
  }

  // 답변 스트리밍용 단어 래핑 (inline span → opacity 만)
  function splitWords(sel) {
    const root = document.querySelector(sel);
    const words = [];
    if (!root) return words;
    (function walk(node) {
      [].slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.nodeValue.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            const s = document.createElement("span");
            s.className = "w";
            s.textContent = p;
            frag.appendChild(s);
            words.push(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) {
          walk(n);
        }
      });
    })(root);
    return words;
  }

  // 카운트업 — 자릿수에 맞춰 스냅 (gsap.md §2-1 (4))
  function countStep(t) {
    t = Math.abs(t);
    if (t >= 1e7) return 10000;
    if (t >= 1e6) return 1000;
    if (t >= 1e5) return 500;
    if (t >= 1e4) return 100;
    if (t >= 1e3) return 10;
    if (t >= 200) return 5;
    return 1;
  }
  const FMT = { time: function (v) { return Math.floor(v / 60) + "분 " + (v % 60) + "초"; } };
  function countUp(t, el, pos) {
    const to = +el.dataset.to;
    const step = countStep(to);
    const fmt = FMT[el.dataset.fmt] || function (v) { return v.toLocaleString(); };
    const o = { v: 0 };
    el.textContent = fmt(0);
    t.to(o, {
      v: to, duration: 1.6, ease: "expo.inOut",
      onUpdate: function () { el.textContent = fmt(Math.round(o.v / step) * step); },
      onComplete: function () { el.textContent = fmt(to); },
    }, pos);
  }

  // 지웠다가 다시 타이핑
  function typeText(t, node, from, to, dur, pos) {
    const o = { n: 0 };
    t.to(o, {
      n: from.length + to.length, duration: dur, ease: "none",
      onStart: function () { node.classList.add("typing"); },
      onUpdate: function () {
        const n = Math.round(o.n);
        node.textContent = n <= from.length ? from.slice(0, from.length - n) : to.slice(0, n - from.length);
      },
      onComplete: function () { node.textContent = to; node.classList.remove("typing"); },
    }, pos);
  }

  // 섹션 헤드 공통 (영문 타이틀 → 국문 타이틀 줄 스플릿 → 설명)
  function headReveal(sec) {
    const lines = splitLines(sec + " .sec_tit");
    revealAt(sec + " .sec_head", function (t) {
      t.from(sec + " .sec_en", { opacity: 0, yPercent: 30 }, "< 0%")
        .from(lines, { opacity: 0, yPercent: 30, stagger: 0.15 }, "< 30%")
        .from(sec + " .sec_desc", { opacity: 0, yPercent: 30 }, "< 40%");
    });
  }

  // 자기장(근접) 호버 — 자기장 효과.md §3
  function initMagneticField(options) {
    if (!window.gsap || !window.jQuery) return;
    if (REDUCE) return;
    const $ = window.jQuery;
    const opt = $.extend({
      selector: "", group: "", influenceRadius: 200, maxRotation: 6, maxTilt: 4, maxLift: 0,
      perspective: 700, followDuration: 0.35, settleDuration: 0.45, idle: null,
      media: "(min-width: 600px) and (hover: hover) and (pointer: fine)", ns: "magnetic",
    }, options);
    const $targets = $(opt.selector);
    if (!$targets.length) return;
    const $group = opt.group ? $(opt.group).first() : null;

    gsap.matchMedia().add(opt.media, function () {
      const ns = "." + opt.ns;
      let frameId = null, settleCall = null, pointerX = 0, pointerY = 0, influenced = false;
      const states = $targets.map(function () {
        const el = this;
        const base = parseFloat(gsap.getProperty(el, "rotation")) || 0;
        const quick = function (prop) { return gsap.quickTo(el, prop, { duration: opt.followDuration, ease: "power3.out" }); };
        return { el: el, base: base, yTo: quick("y"), rTo: quick("rotation"), rxTo: quick("rotationX"), ryTo: quick("rotationY") };
      }).get();
      const elements = states.map(function (s) { return s.el; });
      gsap.set(elements, { transformPerspective: opt.perspective, transformOrigin: "50% 50%" });

      function moveTo(s, y, r, rx, ry, d) {
        s.yTo.tween.duration(d); s.rTo.tween.duration(d); s.rxTo.tween.duration(d); s.ryTo.tween.duration(d);
        s.yTo(y); s.rTo(r); s.rxTo(rx); s.ryTo(ry);
      }
      function settle() {
        if (!influenced) return;
        influenced = false;
        if (settleCall) settleCall.kill();
        states.forEach(function (s) { moveTo(s, 0, s.base, 0, 0, opt.settleDuration); });
      }
      function update() {
        frameId = null;
        if ($group && $group.length) {
          const g = $group[0].getBoundingClientRect();
          if (pointerX < g.left - opt.influenceRadius || pointerX > g.right + opt.influenceRadius ||
              pointerY < g.top - opt.influenceRadius || pointerY > g.bottom + opt.influenceRadius) { settle(); return; }
        }
        let hit = false;
        const targets = states.map(function (s) {
          const rect = s.el.getBoundingClientRect();
          const dx = pointerX - (rect.left + rect.width / 2), dy = pointerY - (rect.top + rect.height / 2);
          const dist = Math.sqrt(dx * dx + dy * dy);
          const strength = Math.max(0, Math.min(1, 1 - dist / opt.influenceRadius));
          const ux = dist ? dx / dist : 0, uy = dist ? dy / dist : 0;
          if (strength > 0) hit = true;
          return { state: s, y: -opt.maxLift * strength, rotation: s.base + ux * opt.maxRotation * strength,
                   rotationX: -uy * opt.maxTilt * strength, rotationY: ux * opt.maxTilt * strength };
        });
        if (!hit) { settle(); return; }
        if (settleCall) { settleCall.kill(); settleCall = null; }
        targets.forEach(function (t) { moveTo(t.state, t.y, t.rotation, t.rotationX, t.rotationY, opt.followDuration); });
        influenced = true;
      }
      function queueUpdate(e) {
        pointerX = e.clientX; pointerY = e.clientY;
        if (!frameId) frameId = window.requestAnimationFrame(update);
      }
      $(window).on("mousemove" + ns, queueUpdate).on("blur" + ns + " scroll" + ns, settle);
      $(document).on("mouseleave" + ns, settle);
      return function () {
        if (frameId) window.cancelAnimationFrame(frameId);
        if (settleCall) settleCall.kill();
        $(window).off(ns); $(document).off(ns);
        gsap.killTweensOf(elements, "y,rotation,rotationX,rotationY,transformPerspective");
        gsap.set(elements, { clearProps: "transform,transform-origin" });
      };
    });
  }

  /* =========================================================
     vs01 · V EDIT — 수정모드 데모 (단계 상태기계)
     PC : 핀 진행도로 단계 전환 (파일 최하단 핀 블록)
     MO : 화면에 들어오면 자동 재생 + 탭으로 이동
     ========================================================= */
  const S1 = (function () {
    const root = document.querySelector(".vs01");
    if (!root) return null;
    const mock = root.querySelector(".vs01_mock");
    const view = mock.querySelector(".mock_view");
    const q = function (s) { return view.querySelector(s); };
    const qa = function (s) { return [].slice.call(view.querySelectorAll(s)); };
    const el = {
      editBtn: q(".ms_edit_btn"), editTxt: q(".ms_edit_btn span"), telBtn: q(".ms_tel_btn"),
      kicker: q(".ms_kicker_t"), titleB: q(".ms_title_b"), img: q(".ms_hero_img"), img2: q(".ms_hero_img .ph2"),
      tels: qa(".ms_tel"), toolbar: q(".ms_toolbar"), hex: q(".tb_hex"), dim: q(".ms_dim"),
      imgModal: q(".ms_img_modal"), imgNew: q(".ms_img_modal .md_new"), imgApply: q(".ms_img_modal .md_apply"),
      telModal: q(".ms_tel_modal"), telInput: q(".md_input_t"), telApply: q(".ms_tel_modal .md_apply"),
      save: q(".ms_save"), saveN: q(".ms_save b"), cursor: q(".ms_cursor"), ripple: q(".ms_ripple"),
      pops: q(".ms_pops"), popDim: q(".ms_pop_dim"), panel: q(".ms_pop_panel"), popList: qa(".ms_pop"),
      dots: q(".ms_pop_dots"), dotList: qa(".ms_pop_dots i"),
      chipSlide: q('[data-chip="slide"]'), chipList: q('[data-chip="list"]'),
    };
    const steps = [].slice.call(root.querySelectorAll(".vs01_step"));
    const cap = root.querySelector(".vs01_mocap");
    const TXT = { kOld: "매일 아침 직접 로스팅하는", kNew: "갓 볶은 원두로 여는 아침", hexOld: "#7A4B2A", hexNew: "#3235CD", telOld: "1588-0000", telNew: "1577-1234" };
    const SAVE = [0, 0, 2, 3, 4];          // 각 단계 시작 시점의 저장 대기 수
    let tl = null, cur = -1;

    function pt(target, ox, oy) {
      const v = view.getBoundingClientRect(), r = target.getBoundingClientRect();
      return { x: r.left - v.left + r.width * (ox == null ? 0.5 : ox), y: r.top - v.top + r.height * (oy == null ? 0.5 : oy) };
    }
    function moveTo(t, target, pos, dur, ox, oy) {
      t.to(el.cursor, {
        x: function () { return pt(target, ox, oy).x; },
        y: function () { return pt(target, ox, oy).y; },
        duration: dur || 0.8, ease: "power2.inOut",
      }, pos);
    }
    function park(t, px, py, pos, dur) {
      t.to(el.cursor, { x: function () { return view.clientWidth * px; }, y: function () { return view.clientHeight * py; }, duration: dur || 1, ease: "power2.inOut" }, pos);
    }
    // 누르기 + 물결. fn 은 손을 떼는 순간 실행
    function click(t, pos, fn) {
      t.to(el.cursor, { scale: 0.82, duration: 0.12, yoyo: true, repeat: 1, ease: "power1.inOut", onComplete: fn }, pos);
      t.fromTo(el.ripple,
        { x: function () { return gsap.getProperty(el.cursor, "x"); }, y: function () { return gsap.getProperty(el.cursor, "y"); }, scale: 0.2, autoAlpha: 0.8 },
        { scale: 1, autoAlpha: 0, duration: 0.55, ease: "power2.out" }, "< 0%");
    }
    function bump(t, n, pos) {
      t.fromTo(el.save, { scale: 1.14 }, { scale: 1, duration: 0.5, ease: "back.out(2)", onStart: function () { el.saveN.textContent = n; } }, pos);
    }
    function setChip(mode) {
      el.chipSlide.classList.toggle("on", mode === "slide");
      el.chipList.classList.toggle("on", mode === "list");
    }
    function setDot(i) { el.dotList.forEach(function (d, k) { d.classList.toggle("on", k === i); }); }
    function slotDx(i) {
      const c = function (n) { const r = n.getBoundingClientRect(); return r.left + r.width / 2; };
      return c(el.popList[1]) - c(el.popList[i]);
    }
    function placeToolbar() {
      const v = view.getBoundingClientRect(), r = el.titleB.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(mock).fontSize);
      gsap.set(el.toolbar, { left: r.left - v.left - fs * 0.2, top: r.top - v.top - el.toolbar.offsetHeight - fs * 0.6 });
    }
    function slide(t, a, b, pos) {
      t.to(el.popList[a], { autoAlpha: 0, duration: 0.5, delay: 1.1, onStart: function () { setDot(b); } }, pos);
      t.fromTo(el.popList[b], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, "< 0%");
    }

    // 단계 i 를 "시작하기 직전" 상태로 맞춘다 (앞 단계 결과는 반영된 상태)
    function setBase(i) {
      if (tl) { tl.kill(); tl = null; }
      const edit = i >= 1;
      mock.classList.toggle("is-edit", edit);
      el.editBtn.classList.toggle("on", edit);
      el.editTxt.textContent = edit ? "수정 끄기" : "수정 켜기";
      el.kicker.textContent = i >= 2 ? TXT.kNew : TXT.kOld;
      el.titleB.classList.remove("sel");
      gsap.set(el.titleB, { color: i >= 2 ? TXT.hexNew : TXT.hexOld });
      el.hex.textContent = TXT.hexOld;
      el.telInput.textContent = TXT.telOld;
      [el.kicker, el.hex, el.telInput].forEach(function (n) { n.classList.remove("typing"); });
      gsap.set(el.img2, { opacity: i >= 3 ? 1 : 0 });
      el.tels.forEach(function (n) { n.textContent = i >= 4 ? TXT.telNew : TXT.telOld; });
      gsap.set(el.tels, { backgroundColor: "rgba(255,214,0,0)" });
      gsap.set([el.toolbar, el.imgModal, el.imgNew, el.telModal, el.dim, el.pops, el.popDim, el.panel, el.dots], { autoAlpha: 0, x: 0, y: 0 });
      gsap.set(el.popList, { autoAlpha: 0, x: 0, y: 0 });
      gsap.set(el.ripple, { autoAlpha: 0 });
      setChip("list");
      setDot(0);
      el.saveN.textContent = SAVE[i];
      gsap.set(el.save, { autoAlpha: edit && i < 4 ? 1 : 0, scale: 1, y: 0 });
    }

    const plays = [
      // 01 수정모드 켜기
      function (t) {
        moveTo(t, el.editBtn, "< 0%", 1.1);
        click(t, "< 100%", function () {
          mock.classList.add("is-edit");
          el.editBtn.classList.add("on");
          el.editTxt.textContent = "수정 끄기";
        });
        t.fromTo(el.save, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" }, "< 70%");
        park(t, 0.55, 0.6, "< 60%", 1.1);
      },
      // 02 글자 수정
      function (t) {
        moveTo(t, el.titleB, "< 0%", 0.9, 0.35, 0.7);
        click(t, "< 100%", function () { el.titleB.classList.add("sel"); placeToolbar(); });
        t.fromTo(el.toolbar, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: "power3.out" }, "< 50%");
        moveTo(t, el.hex, "< 60%", 0.6);
        click(t, "< 100%");
        typeText(t, el.hex, TXT.hexOld, TXT.hexNew, 0.9, "< 60%");
        t.to(el.titleB, { color: TXT.hexNew, duration: 0.6, ease: "power1.out" }, "< 90%");
        bump(t, 1, "< 60%");
        t.to(el.toolbar, { autoAlpha: 0, y: 6, duration: 0.35, delay: 0.3, onStart: function () { el.titleB.classList.remove("sel"); } }, "< 50%");
        moveTo(t, el.kicker, "< 0%", 0.7, 1, 0.5);
        click(t, "< 100%");
        typeText(t, el.kicker, TXT.kOld, TXT.kNew, 1.6, "< 60%");
        bump(t, 2, "< 100%");
      },
      // 03 이미지 교체
      function (t) {
        moveTo(t, el.img, "< 0%", 0.9, 0.5, 0.45);
        click(t, "< 100%");
        t.fromTo(el.dim, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, "< 30%");
        t.fromTo(el.imgModal, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" }, "< 0%");
        t.fromTo(el.imgNew, { autoAlpha: 0, x: 10 }, { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out" }, "< 90%");
        moveTo(t, el.imgApply, "< 60%", 0.7);
        click(t, "< 100%");
        t.to(el.imgModal, { autoAlpha: 0, y: 10, duration: 0.35 }, "< 40%");
        t.to(el.dim, { autoAlpha: 0, duration: 0.35 }, "< 0%");
        t.to(el.img2, { opacity: 1, duration: 0.9, ease: "power2.out" }, "< 50%");
        bump(t, 3, "< 30%");
        park(t, 0.5, 0.8, "< 0%", 0.9);
      },
      // 04 대표번호 일괄 수정
      function (t) {
        moveTo(t, el.telBtn, "< 0%", 0.9);
        click(t, "< 100%");
        t.fromTo(el.dim, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, "< 30%");
        t.fromTo(el.telModal, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" }, "< 0%");
        moveTo(t, el.telInput, "< 70%", 0.6, 1, 0.5);
        click(t, "< 100%");
        typeText(t, el.telInput, TXT.telOld, TXT.telNew, 1.4, "< 60%");
        moveTo(t, el.telApply, "< 100%", 0.6);
        click(t, "< 100%");
        t.to(el.telModal, { autoAlpha: 0, y: 10, duration: 0.35 }, "< 40%");
        t.to(el.dim, { autoAlpha: 0, duration: 0.35, onComplete: function () { el.tels.forEach(function (n) { n.textContent = TXT.telNew; }); } }, "< 0%");
        t.fromTo(el.tels, { backgroundColor: "rgba(255,214,0,.95)" }, { backgroundColor: "rgba(255,214,0,0)", duration: 1.4, stagger: 0.15, ease: "power1.in" }, "< 100%");
        bump(t, 4, "< 0%");
        park(t, 0.62, 0.55, "< 0%", 1);
      },
      // 05 팝업 디자인 (관리자 팝업 표시 설정)
      function (t) {
        t.to(el.save, { autoAlpha: 0, duration: 0.3 }, "< 0%");
        t.fromTo(el.pops, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, "< 0%");
        t.fromTo(el.panel, { autoAlpha: 0, x: -16 }, { autoAlpha: 1, x: 0, duration: 0.7, ease: "power3.out" }, "< 0%");
        t.fromTo(el.popDim, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, "< 20%");
        t.fromTo(el.popList, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.12, ease: "power3.out" }, "< 40%");
        moveTo(t, el.chipSlide, "< 100%", 0.9);
        click(t, "< 100%", function () { setChip("slide"); });
        t.to(el.popList[0], { x: function () { return slotDx(0); }, autoAlpha: 0, duration: 0.7, ease: "power3.inOut" }, "< 50%");
        t.to(el.popList[2], { x: function () { return slotDx(2); }, autoAlpha: 0, duration: 0.7, ease: "power3.inOut" }, "< 0%");
        t.fromTo(el.dots, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, "< 60%");
        park(t, 0.93, 0.9, "< 0%", 1);
        slide(t, 1, 2, "< 100%");
        slide(t, 2, 0, "< 100%");
      },
    ];

    function caption(i) {
      if (!cap) return;
      cap.querySelector("b").textContent = steps[i].querySelector(".txt b").textContent;
      cap.querySelector("span").textContent = steps[i].querySelector(".txt i").textContent;
    }
    function go(i, force) {
      if (i === cur && !force) return null;
      cur = i;
      steps.forEach(function (b, k) { b.classList.toggle("on", k === i); });
      caption(i);
      setBase(i);
      if (REDUCE) {                          // 모션 줄이기 — 단계 결과만 정지 화면으로
        setBase(Math.min(i + 1, 4));
        if (i === 4) gsap.set([el.pops, el.popDim, el.panel].concat(el.popList), { autoAlpha: 1 });
        return null;
      }
      tl = gsap.timeline({ defaults: { ease: "power2.inOut", immediateRender: false } });
      plays[i](tl);
      return tl;
    }
    function reset() {
      cur = -1;
      setBase(0);
      steps.forEach(function (b, k) { b.classList.toggle("on", k === 0); });
      caption(0);
    }

    gsap.set(el.cursor, { transformOrigin: "20% 10%", x: view.clientWidth * 0.8, y: view.clientHeight * 0.82 });
    setBase(0);

    return {
      go: go, reset: reset, steps: steps, count: steps.length,
      pause: function () { if (tl) tl.pause(); },
      resume: function () { if (tl) tl.resume(); },
      done: function () { return !tl || tl.progress() === 1; },
      cur: function () { return cur; },
    };
  })();

  /* ---------- vs01 등장 ---------- */
  const v1Lines = splitLines(".vs01_q");
  revealAt(".vs01_intro", function (t) {
    t.from(".vs01 .sec_en", { opacity: 0, yPercent: 30 }, "< 0%")
      .from(v1Lines, { opacity: 0, yPercent: 30, stagger: 0.15 }, "< 30%")
      .from(".vs01_a", { opacity: 0, yPercent: 30 }, "< 50%")
      .from(".vs01_desc", { opacity: 0, yPercent: 30 }, "< 30%")
      .from(".vs01_ul", { scaleX: 0, duration: 1.1, ease: "power3.inOut" }, "< 20%");
  });

  mm.add(PC, function () {
    // 좌(단계 목록) · 우(목업) 한 화면 → 동시 등장 (gsap.md §3-15)
    revealAt(".vs01_demo", function (t) {
      t.from(".vs01_mock", { opacity: 0, yPercent: 8, duration: 1.2 }, "< 0%")
        .from(".vs01_step", { opacity: 0, xPercent: -8, stagger: 0.08 }, "< 0%");
    }, "top 75%");
  });
  mm.add(MO, function () {
    revealAt(".vs01_steps", function (t) {
      t.from(".vs01_step", { opacity: 0, xPercent: 20, stagger: 0.08, duration: 0.95 }, "< 0%");
    }, "top 88%");
    revealAt(".vs01_mock", function (t) {
      t.from(".vs01_mock", { opacity: 0, yPercent: 8, duration: 0.95 }, "< 0%")
        .from(".vs01_mocap", { opacity: 0, yPercent: 30, duration: 0.95 }, "< 30%");
    }, "top 85%");

    // 모바일 — 핀 없이 자동 재생 (핀.md §1: 모바일 핀 금지)
    if (!S1) return;
    let timer = null, on = false;
    function play(i) {
      clearTimeout(timer);
      const t = S1.go(i, true);
      const b = S1.steps[i], wrap = b.parentElement;
      wrap.scrollTo({ left: b.offsetLeft - (wrap.clientWidth - b.offsetWidth) / 2, behavior: "smooth" });
      if (t) t.eventCallback("onComplete", function () {
        timer = setTimeout(function () { if (on) play((i + 1) % S1.count); }, 1600);
      });
    }
    function onTab(e) { play(S1.steps.indexOf(e.currentTarget)); }
    S1.steps.forEach(function (b) { b.addEventListener("click", onTab); });
    ScrollTrigger.create({
      trigger: ".vs01_mock", start: "top 75%", end: "bottom 15%",
      onToggle: function (self) {
        on = self.isActive;
        if (on) {
          if (S1.cur() < 0) play(0);
          else if (S1.done()) play((S1.cur() + 1) % S1.count);
          else S1.resume();
        } else {
          clearTimeout(timer);
          S1.pause();
        }
      },
    });
    return function () {
      clearTimeout(timer);
      S1.steps.forEach(function (b) { b.removeEventListener("click", onTab); });
      S1.reset();
    };
  });

  /* ---------- vs01 하단 (링크 · 슬라이드 · 매장 / 저장) ---------- */
  revealAt(".vs01_more_tit", function (t) {
    t.from(".vs01_more_tit", { opacity: 0, yPercent: 30 }, "< 0%");
  }, "top 82%");
  // 2×2 / 1×4 모두 묶음 높이 < 뷰포트 → 한 트리거 + stagger (gsap.md §6-0)
  const mcInput = document.querySelector(".mc_input_t");
  revealAt(".vs01_more_cards", function (t) {
    const word = mcInput.textContent;
    mcInput.textContent = "";
    t.from(".vs01_more .mc", { opacity: 0, yPercent: 20, stagger: 0.12 }, "< 0%")
      .from(".vs01_more .mc_new", { opacity: 0, scale: 0.6, duration: 0.7, ease: "back.out(2)", stagger: 0.12 }, "< 70%");
    typeText(t, mcInput, "", word, 0.9, "< 0%");
  }, "top 80%");
  revealAt(".vs01_savebox", function (t) {
    t.from(".vs01_savebtn", { opacity: 0, yPercent: 30 }, "< 0%")
      .from(".vs01_saved", { opacity: 0, yPercent: 30 }, "< 20%")
      .to(".vs01_savebtn", { scale: 0.95, duration: 0.14, yoyo: true, repeat: 1, ease: "power1.inOut" }, "< 60%")
      .to(".s_idle", { autoAlpha: 0, yPercent: -100, duration: 0.35, ease: "power2.in" }, "< 60%")
      .fromTo(".s_ing", { autoAlpha: 0, yPercent: 100 }, { autoAlpha: 1, yPercent: 0, duration: 0.35, ease: "power2.out" }, "< 60%")
      .to(".s_ing", { autoAlpha: 0, yPercent: -100, duration: 0.35, delay: 0.6, ease: "power2.in" }, "< 100%")
      .to(".vs01_savebtn", { backgroundColor: "#16a34a", boxShadow: "0 10px 30px rgba(22,163,74,.35)", duration: 0.4 }, "< 30%")
      .fromTo(".s_done", { autoAlpha: 0, yPercent: 100 }, { autoAlpha: 1, yPercent: 0, duration: 0.45, ease: "power3.out" }, "< 30%")
      .fromTo(".vs01_saved strong", { color: "#111111" }, { color: "#16a34a", duration: 0.5, ease: "power1.out" }, "< 0%");
  }, "top 85%");

  /* =========================================================
     vs02 · V SEARCH
     ========================================================= */
  headReveal(".vs02");

  const pairKeys = ["name", "addr", "tel", "mail", "sns", "maker"];
  function pairs(t, pos) {
    pairKeys.forEach(function (k, i) {
      t.to({}, {
        duration: 0.75,
        onStart: function () {
          document.querySelectorAll(".vs02 .hk.hl").forEach(function (n) { n.classList.remove("hl"); });
          document.querySelectorAll('.vs02 .hk[data-k="' + k + '"]').forEach(function (n) { n.classList.add("hl"); });
          document.querySelector('.vm_list li[data-k="' + k + '"]').classList.add("ok");
        },
      }, i === 0 ? pos : "< 100%");
    });
    t.to({}, { duration: 0.1, onStart: function () { document.querySelectorAll(".vs02 .hk.hl").forEach(function (n) { n.classList.remove("hl"); }); } }, "< 100%");
  }
  const aiWords = splitWords(".ai_a_txt");
  function answer(t, pos) {
    t.from(".ai_q", { opacity: 0, yPercent: 30, duration: 0.7 }, pos)
      .fromTo(".ai_think", { opacity: 0 }, { opacity: 1, duration: 0.3 }, "< 80%")
      .to(".ai_think", { opacity: 0, duration: 0.25, delay: 0.8 }, "< 100%")
      .from(".ai_a", { opacity: 0, yPercent: 10, duration: 0.6 }, "< 60%")
      .from(aiWords, { opacity: 0, duration: 0.4, stagger: 0.05, ease: "power1.out" }, "< 30%")
      .from(".ai_src", { opacity: 0, yPercent: 30, duration: 0.6 }, "< 100%");
  }

  mm.add(PC, function () {
    revealAt(".vs02_compare", function (t) {
      t.from(".vs02_human", { opacity: 0, xPercent: -8 }, "< 0%")
        .from(".vs02_ai", { opacity: 0, xPercent: 8 }, "< 0%")              // 마주보기 쌍
        .from(".vs02_ai .cl", { opacity: 0.12, duration: 0.5, stagger: 0.045, ease: "power1.out" }, "< 20%")
        .from(".vs02_mid", { opacity: 0, yPercent: 20 }, "< 30%");
      pairs(t, "< 60%");
    }, "top 72%");
    revealAt(".vs02_answer", function (t) {
      t.from(".ai_ui", { opacity: 0, yPercent: 10 }, "< 0%")
        .from(".ans_txt > *", { opacity: 0, yPercent: 30, stagger: 0.12 }, "< 0%");
      answer(t, "< 30%");
    }, "top 72%");
    revealAt(".vs02_pillars", function (t) {
      t.from(".vs02 .pl", { opacity: 0, yPercent: 20, stagger: 0.12 }, "< 0%");
    });
    revealAt(".vs02_chips", function (t) {
      t.from(".vs02_chips li", { opacity: 0, yPercent: 30, stagger: 0.04, duration: 0.8 }, "< 0%");
    }, "top 90%");
  });
  mm.add(MO, function () {
    revealAt(".vs02_human", function (t) { t.from(".vs02_human", { opacity: 0, yPercent: 8, duration: 0.95 }, "< 0%"); }, "top 85%");
    revealAt(".vs02_ai", function (t) {
      t.from(".vs02_ai", { opacity: 0, yPercent: 8, duration: 0.95 }, "< 0%")
        .from(".vs02_ai .cl", { opacity: 0.12, duration: 0.45, stagger: 0.035, ease: "power1.out" }, "< 20%");
      pairs(t, "< 60%");
    }, "top 78%");
    revealAt(".vs02_mid", function (t) { t.from(".vs02_mid", { opacity: 0, yPercent: 20, duration: 0.95 }, "< 0%"); }, "top 92%");
    revealAt(".ans_txt", function (t) { t.from(".ans_txt > *", { opacity: 0, yPercent: 30, stagger: 0.12, duration: 0.95 }, "< 0%"); }, "top 85%");
    revealAt(".ai_ui", function (t) {
      t.from(".ai_ui", { opacity: 0, yPercent: 8, duration: 0.95 }, "< 0%");
      answer(t, "< 40%");
    }, "top 80%");
    revealEach(".vs02 .pl", { opacity: 0, yPercent: 15 });
    revealAt(".vs02_chips", function (t) {
      t.from(".vs02_chips li", { opacity: 0, yPercent: 30, stagger: 0.04, duration: 0.8 }, "< 0%");
    }, "top 92%");
  });
  initMagneticField({ selector: ".vs02 .pl_card", group: ".vs02_pillars", influenceRadius: 260, maxRotation: 1.5, maxTilt: 5, maxLift: 6, ns: "mag02" });

  /* =========================================================
     vs03 · V FAST & SAFE
     ========================================================= */
  headReveal(".vs03");

  function spVis() {
    const v = gsap.timeline({ defaults: { ease: "power3.out" } });
    const s1 = gsap.timeline();
    s1.fromTo(".sp1 .bar i", { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "power3.out" }, "< 0%")
      .to(".sp1 .bar_opt i", { scaleX: 0.42, duration: 1.4, ease: "power3.inOut" }, "< 100%");
    const s2 = gsap.timeline();
    s2.fromTo(".sp2 .scanline", { y: 0, opacity: 0 }, { y: function () { return document.querySelector(".sp2 .sp_vis").clientHeight; }, opacity: 1, duration: 2, ease: "none" }, "< 0%")
      .fromTo(".sp2 .tiles i:not(.now)", { opacity: 0 }, { opacity: 1, duration: 0.5, stagger: 0.25 }, "< 50%")
      .to(".sp2 .scanline", { opacity: 0, duration: 0.3 }, "< 100%");
    const s3 = gsap.timeline();
    s3.fromTo(".sp3 .f_real", { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 0.8 }, "< 0%")
      .fromTo(".sp3 .f_fb", { opacity: 1 }, { opacity: 0, duration: 0.6 }, "< 0%");
    const s4 = gsap.timeline();
    s4.fromTo(".sp4 .pk", { x: 0 }, {
      x: function () { const l = document.querySelector(".sp4 .pk_line"), p = document.querySelector(".sp4 .pk"); return l.offsetWidth - p.offsetWidth; },
      duration: 1.2, repeat: 2, ease: "power1.inOut",
    }, "< 0%");
    v.add(s1, "< 0%").add(s2, "< 0%").add(s3, "< 0%").add(s4, "< 0%");
    return v;
  }

  mm.add(PC, function () {
    revealAt(".vs03_speed", function (t) {
      t.from(".sp_head > *", { opacity: 0, yPercent: 30, stagger: 0.12 }, "< 0%")
        .from(".vs03 .sp", { opacity: 0, yPercent: 20, stagger: 0.12 }, "< 30%")
        .add(spVis(), "< 50%");
    }, "top 75%");
    revealAt(".vs03_secure", function (t) {
      t.from(".radar .rd_ring", { opacity: 0, scale: 0.85, stagger: 0.12, duration: 1.2 }, "< 0%")
        .from(".term", { opacity: 0, xPercent: 6 }, "< 0%")                 // 좌우 동시
        .from(".rd_core", { opacity: 0, scale: 0.6, duration: 0.9, ease: "back.out(1.6)" }, "< 30%")
        .from(".rd_legend", { opacity: 0, duration: 0.8 }, "< 40%")
        .from(".tl", { opacity: 0.15, x: -8, duration: 0.5, stagger: 0.22, ease: "power2.out" }, "< 0%")
        .to(".live_dot", { duration: 0.1, delay: 0.4, onStart: function () { this.targets()[0].classList.add("animate-blk"); } }, "< 100%");
    }, "top 78%");
    revealAt(".vs03_cards", function (t) {
      t.from(".vs03 .dc", { opacity: 0, yPercent: 20, stagger: 0.08 }, "< 0%")
        .from(".vs03_note", { opacity: 0, yPercent: 30 }, "< 60%");
    }, "top 80%");
  });
  mm.add(MO, function () {
    revealAt(".sp_head", function (t) { t.from(".sp_head > *", { opacity: 0, yPercent: 30, stagger: 0.12, duration: 0.95 }, "< 0%"); }, "top 85%");
    revealAt(".sp_grid", function (t) {
      t.from(".vs03 .sp", { opacity: 0, yPercent: 15, stagger: 0.1, duration: 0.95 }, "< 0%")
        .add(spVis(), "< 50%");
    }, "top 80%");
    revealAt(".radar", function (t) {
      t.from(".radar .rd_ring", { opacity: 0, scale: 0.85, stagger: 0.12, duration: 0.95 }, "< 0%")
        .from(".rd_core", { opacity: 0, scale: 0.6, duration: 0.8, ease: "back.out(1.6)" }, "< 30%")
        .from(".rd_legend", { opacity: 0, duration: 0.8 }, "< 40%");
    }, "top 80%");
    revealAt(".term", function (t) {
      t.from(".term", { opacity: 0, yPercent: 8, duration: 0.95 }, "< 0%")
        .from(".tl", { opacity: 0.15, x: -8, duration: 0.45, stagger: 0.18, ease: "power2.out" }, "< 30%")
        .to(".live_dot", { duration: 0.1, delay: 0.3, onStart: function () { this.targets()[0].classList.add("animate-blk"); } }, "< 100%");
    }, "top 80%");
    // 2열 × 4행 → 묶음이 뷰포트보다 김 → 카드마다 자기 트리거
    gsap.utils.toArray(".vs03 .dc").forEach(function (el, i) {
      revealAt(el, function (t) { t.from(el, { opacity: 0, yPercent: 15, duration: 0.95, delay: (i % 2) * 0.1 }, "< 0%"); }, "top 90%");
    });
    revealAt(".vs03_note", function (t) { t.from(".vs03_note", { opacity: 0, yPercent: 30, duration: 0.95 }, "< 0%"); }, "top 92%");
  });

  // 레이더 — 봇은 링에서 멈추고 진짜 방문자만 중심까지 (화면 밖이면 정지)
  (function radar() {
    const box = document.querySelector(".rd_dots");
    if (!box || REDUCE) return;
    const pulse = document.querySelector(".rd_pulse");
    const ringR = [0.5, 0.35, 0.21];
    const live = new Set();
    const dots = [];
    let running = false;
    for (let i = 0; i < 10; i++) {
      const d = document.createElement("i");
      const bot = i % 3 !== 2;
      d.className = "rd_dot " + (bot ? "bot" : "hum");
      box.appendChild(d);
      dots.push({ d: d, bot: bot, started: false, wait: false });
    }
    function spawn(o) {
      if (!running) { o.wait = true; return; }
      const R = box.clientWidth / 2, a = Math.random() * Math.PI * 2;
      const r0 = R * 1.06, r1 = o.bot ? R * ringR[Math.floor(Math.random() * 3)] : R * 0.1;
      const t = gsap.timeline({
        onComplete: function () { live.delete(t); gsap.delayedCall(gsap.utils.random(0.2, 1.2), function () { spawn(o); }); },
      });
      live.add(t);
      t.set(o.d, { x: Math.cos(a) * r0, y: Math.sin(a) * r0, scale: 1, opacity: 0 })
        .to(o.d, { opacity: 1, duration: 0.3 }, "< 0%")
        .to(o.d, { x: Math.cos(a) * r1, y: Math.sin(a) * r1, duration: o.bot ? 1.6 : 2, ease: o.bot ? "power2.out" : "power1.inOut" }, "< 0%")
        .to(o.d, o.bot
          ? { scale: 2.6, opacity: 0, duration: 0.45, ease: "power2.out" }
          : { scale: 0.3, opacity: 0, duration: 0.35, onStart: function () { gsap.fromTo(pulse, { scale: 1, opacity: 0.7 }, { scale: 1.9, opacity: 0, duration: 0.9, ease: "power2.out" }); } },
          "< 100%");
    }
    ScrollTrigger.create({
      trigger: ".radar", start: "top 90%", end: "bottom 10%",
      onToggle: function (self) {
        running = self.isActive;
        if (running) {
          live.forEach(function (t) { t.resume(); });
          dots.forEach(function (o, i) {
            if (o.started && !o.wait) return;
            o.started = true;
            o.wait = false;
            gsap.delayedCall(i * 0.35, function () { spawn(o); });
          });
        } else {
          live.forEach(function (t) { t.pause(); });
        }
      },
    });
  })();

  /* =========================================================
     vs04 · V INSIGHT
     ========================================================= */
  headReveal(".vs04");

  function kpiAnim(t, pos) {
    t.from(".db_kpi .kpi", { opacity: 0, yPercent: 20, stagger: 0.08, duration: 0.8 }, pos);
    document.querySelectorAll(".db .cnt").forEach(function (el, i) { countUp(t, el, i === 0 ? "< 30%" : "< 0%"); });
  }
  function chartAnim(t, scope, pos) {
    t.from(scope + " .hbar p i, " + scope + " .fun p i", { scaleX: 0, duration: 1.2, stagger: 0.05, ease: "power3.out" }, pos);
    if (document.querySelector(scope + " .dn")) t.from(scope + " .dn", { attr: { "stroke-dasharray": "0 100" }, duration: 1.4, stagger: 0.15, ease: "power3.out" }, "< 0%");
    if (document.querySelector(scope + " .fun_out")) t.from(scope + " .fun_out", { opacity: 0, duration: 0.6 }, "< 60%");
  }

  mm.add(PC, function () {
    revealAt(".vs04_body", function (t) {
      t.from(".db", { opacity: 0, yPercent: 8, duration: 1.2 }, "< 0%")
        .from(".vs04 .nt", { opacity: 0, xPercent: 8, stagger: 0.12 }, "< 0%");   // 좌우 동시
      kpiAnim(t, "< 30%");
      t.from(".db .card", { opacity: 0, yPercent: 12, stagger: 0.1, duration: 0.8 }, "< 20%");
      chartAnim(t, ".db", "< 40%");
    }, "top 70%");
    revealAt(".vs04_chips", function (t) {
      t.from(".vs04_chips li", { opacity: 0, yPercent: 30, stagger: 0.06, duration: 0.8 }, "< 0%");
    }, "top 90%");
  });
  mm.add(MO, function () {
    revealAt(".db", function (t) {
      t.from(".db", { opacity: 0, yPercent: 5, duration: 0.95 }, "< 0%");
      kpiAnim(t, "< 30%");
    }, "top 82%");
    gsap.utils.toArray(".db .card").forEach(function (card, i) {
      card.classList.add("dbc" + i);
      revealAt(card, function (t) {
        t.from(card, { opacity: 0, yPercent: 12, duration: 0.95 }, "< 0%");
        chartAnim(t, ".dbc" + i, "< 30%");
      }, "top 85%");
    });
    revealEach(".vs04 .nt", { opacity: 0, yPercent: 15 });
    revealAt(".vs04_chips", function (t) {
      t.from(".vs04_chips li", { opacity: 0, yPercent: 30, stagger: 0.06, duration: 0.8 }, "< 0%");
    }, "top 92%");
  });

  /* =========================================================
     vs05 · V ALL IN ONE
     ========================================================= */
  headReveal(".vs05");

  const m3 = document.querySelector(".m3"), m5 = document.querySelector(".m5");
  const mgr = document.querySelector(".mgr_t"), hitB = document.querySelector(".aa_bar .b");
  function chatPart(t, pos) {
    t.from(".m1", { opacity: 0, y: 10, duration: 0.5 }, pos)
      .from(".quick span", { opacity: 0, y: 8, stagger: 0.08, duration: 0.5 }, "< 60%")
      .to(".quick .q1", { backgroundColor: "#3235CD", color: "#fff", duration: 0.25, delay: 0.5 }, "< 100%")
      .from(".m2", { opacity: 0, y: 10, duration: 0.5 }, "< 100%")
      .from(".m3", { opacity: 0, y: 10, duration: 0.5, onStart: function () { m3.classList.add("is-typing"); } }, "< 80%")
      .to({}, { duration: 0.9, onComplete: function () { m3.classList.remove("is-typing"); } }, "< 100%")
      .from(".m3 .mtxt", { opacity: 0, duration: 0.4 }, "< 100%")
      .from(".m4", { opacity: 0, y: 10, duration: 0.5, delay: 0.5 }, "< 100%")
      .from(".m5", { opacity: 0, y: 10, duration: 0.5, onStart: function () { m5.classList.add("is-typing"); } }, "< 80%")
      .to({}, { duration: 0.9, onComplete: function () { m5.classList.remove("is-typing"); } }, "< 100%")
      .from(".m5 .mtxt", { opacity: 0, duration: 0.4 }, "< 100%")
      .from(".m6", { opacity: 0, y: 10, duration: 0.5, delay: 0.5 }, "< 100%")
      .from(".m7", { opacity: 0, scale: 0.9, duration: 0.5 }, "< 100%");
  }
  function admPart(t, pos, mo) {
    mgr.textContent = "배정 중";
    mgr.classList.remove("done");
    hitB.classList.remove("hit");
    const flow = document.querySelector(".vs05_flow"), dot = document.querySelector(".fl_dot");
    t.fromTo(".fl_dot", { x: 0, y: 0, opacity: 0 }, {
      x: function () { return mo ? 0 : flow.clientWidth - dot.offsetWidth - dot.offsetLeft * 2; },
      y: function () { return mo ? flow.clientHeight - dot.offsetHeight - dot.offsetTop * 2 : 0; },
      opacity: 1, duration: 1, ease: "power2.inOut",
    }, pos)
      .to(".fl_dot", { opacity: 0, duration: 0.3 }, "< 100%")
      .fromTo(".adm_row.old", { y: function () { return -document.querySelector(".adm_row.new").offsetHeight; } }, { y: 0, duration: 0.7, ease: "power3.out" }, "< 0%")
      .fromTo(".adm_row.new", { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.7, ease: "power3.out" }, "< 30%")
      .to({}, { duration: 0.8, onComplete: function () { mgr.textContent = "B 담당"; mgr.classList.add("done"); hitB.classList.add("hit"); } }, "< 100%")
      .fromTo(".adm_toast", { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out" }, "< 100%")
      .to(".adm_toast", { autoAlpha: 0, y: -8, duration: 0.5, delay: 2.2, ease: "power2.in" }, "< 100%");
  }

  mm.add(PC, function () {
    revealAt(".vs05_chat", function (t) {
      t.from(".phone", { opacity: 0, yPercent: 8, duration: 1.2 }, "< 0%")
        .from(".adm", { opacity: 0, yPercent: 8, duration: 1.2 }, "< 0%")   // 좌우 동시
        .from(".vs05_flow", { opacity: 0, duration: 0.8 }, "< 30%");
      chatPart(t, "< 40%");
      admPart(t, "< 100%", false);
    }, "top 65%");
    revealAt(".vs05_feat", function (t) {
      t.from(".ft_box", { opacity: 0, yPercent: 20, stagger: 0 }, "< 0%");
    }, "top 85%");
  });
  mm.add(MO, function () {
    revealAt(".phone", function (t) {
      t.from(".phone", { opacity: 0, yPercent: 6, duration: 0.95 }, "< 0%");
      chatPart(t, "< 50%");
    }, "top 80%");
    revealAt(".adm", function (t) {
      t.from(".adm", { opacity: 0, yPercent: 6, duration: 0.95 }, "< 0%");
      admPart(t, "< 40%", true);
    }, "top 88%");
    revealEach(".ft_box", { opacity: 0, yPercent: 15 });
  });
  if (REDUCE && mgr) { mgr.textContent = "B 담당"; mgr.classList.add("done"); }

  revealAt(".vs05_outro", function (t) {
    t.from(".mq", { opacity: 0, duration: 1.2 }, "< 0%")
      .from(".oc_logo", { opacity: 0, yPercent: 30, duration: 0.9 }, "< 20%")
      .from(".oc_tit", { opacity: 0, yPercent: 20, duration: 0.9 }, "< 20%")
      .from(".oc_btns > *", { opacity: 0, yPercent: 30, stagger: 0.08, duration: 0.9 }, "< 25%")
      .from(".oc_recap a", { opacity: 0, yPercent: 30, stagger: 0.05, duration: 0.8 }, "< 25%");
  }, "top 80%");

  /* ---------- 데모 상단바 — 현재 섹션 ---------- */
  document.querySelectorAll(".dh_nav a").forEach(function (a) {
    const sec = document.querySelector(a.getAttribute("href"));
    if (sec) ScrollTrigger.create({ trigger: sec, start: "top 50%", end: "bottom 50%", toggleClass: { targets: a, className: "on" } });
  });

  /* =========================================================
     핀 (PC 전용) — 모든 트리거를 만든 뒤 파일 최하단에서 생성 (핀.md §1)
     ========================================================= */
  mm.add(PC, function () {
    if (!S1) return;
    const demo = document.querySelector(".vs01_demo");
    const stage = demo.querySelector(".vs01_stage");
    const fill = demo.querySelector(".vs01_steps_line i");
    const N = S1.count;

    // 핀 시작 전, 화면에 들어오면 01 단계부터 재생 (핀 요소가 아닌 부모를 트리거로 — 핀.md §8-1)
    ScrollTrigger.create({
      trigger: demo, start: "top 65%",
      onEnter: function () { if (S1.cur() < 0) S1.go(0); },
      onLeaveBack: function () { S1.reset(); },
    });

    // 단계 전환 핀 (핀.md 패턴 B + C)
    const pin = ScrollTrigger.create({
      trigger: stage, start: "center center",
      end: function () { return "+=" + Math.round(window.innerHeight * 0.8 * N); },
      pin: true, pinSpacing: true, anticipatePin: ANTICIPATE, refreshPriority: 1, invalidateOnRefresh: true, id: "vs01pin",
      onUpdate: function (self) {
        gsap.set(fill, { scaleY: self.progress });
        if (self.progress > 0) S1.go(Math.min(N - 1, Math.floor(self.progress * N)));   // 콘텐츠 전환의 유일한 소스
      },
    });

    // 단계 클릭 → 스크롤만 옮긴다 (콘텐츠는 onUpdate 가 따라옴)
    // CSS smooth 가 켜져 있으면 매 프레임 scrollTo 가 서로 끊겨 0.6초 멈춘 뒤 움직인다 → 트윈 동안만 auto
    function onStep(e) {
      const i = S1.steps.indexOf(e.currentTarget);
      const p = Math.min(0.98, Math.max(0.02, (i + 0.5) / N));
      docEl.style.setProperty("scroll-behavior", "auto", "important");
      gsap.to(window, {
        scrollTo: pin.start + (pin.end - pin.start) * p, duration: 0.25, ease: "power2.out", overwrite: true,
        onComplete: function () { docEl.style.removeProperty("scroll-behavior"); },
      });
    }
    S1.steps.forEach(function (b) { b.addEventListener("click", onStep); });

    ScrollTrigger.refresh();
    return function () {
      S1.steps.forEach(function (b) { b.removeEventListener("click", onStep); });
      S1.reset();
    };
  });

  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
});
