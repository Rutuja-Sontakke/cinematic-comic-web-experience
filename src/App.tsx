import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const gwenPortrait = new URL("./imports/gwen.jpg", import.meta.url).href;
const gwenSwing = new URL("./imports/gwenSwing.jpg", import.meta.url).href;
const gwenAction = new URL("./imports/gwen1.jpg", import.meta.url).href;

/* ============================================================
   TYPES
   ============================================================ */

type CSSVars = CSSProperties & {
  [key: string]: string | number | undefined;
};

type ScrollState = {
  y: number;
  velocity: number;
  speed: number;
  progress: number;
  dir: number;
  mx: number;
  my: number;
};

type Listener = (s: ScrollState) => void;

/* ============================================================
   SCROLL ENGINE
   ============================================================ */

class ScrollEngine {
  private listeners = new Set<Listener>();
  private raf = 0;
  private running = false;

  private smoothY = 0;

  private targetMouseX = 0;
  private targetMouseY = 0;

  private smoothMouseX = 0;
  private smoothMouseY = 0;

  private glitchTimer = 0;

  private onPointerMove = (e: PointerEvent) => {
    this.targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    this.targetMouseY = (e.clientY / window.innerHeight) * 2 - 1;
  };

  private tick = () => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const raw = window.scrollY;
    const previous = this.smoothY;

    const ease = reduced ? 1 : 0.14;

    this.smoothY += (raw - this.smoothY) * ease;

    const velocity = this.smoothY - previous;
    const speed = Math.min(Math.abs(velocity) / 42, 1);
    const dir = velocity >= 0 ? 1 : -1;

    const maxScroll = Math.max(
      document.documentElement.scrollHeight - window.innerHeight,
      1
    );

    const progress = Math.min(
      Math.max(this.smoothY / maxScroll, 0),
      1
    );

    this.smoothMouseX +=
      (this.targetMouseX - this.smoothMouseX) * 0.08;

    this.smoothMouseY +=
      (this.targetMouseY - this.smoothMouseY) * 0.08;

    const root = document.documentElement;

    root.style.setProperty("--scroll", this.smoothY.toFixed(2));
    root.style.setProperty("--scroll-progress", progress.toFixed(4));
    root.style.setProperty("--scroll-speed", speed.toFixed(3));
    root.style.setProperty("--mouse-x", this.smoothMouseX.toFixed(3));
    root.style.setProperty("--mouse-y", this.smoothMouseY.toFixed(3));

    if (!reduced && speed > 0.5) {
      root.classList.add("glitch-burst");

      window.clearTimeout(this.glitchTimer);

      this.glitchTimer = window.setTimeout(() => {
        root.classList.remove("glitch-burst");
      }, 240);
    }

    const state: ScrollState = {
      y: this.smoothY,
      velocity,
      speed,
      progress,
      dir,
      mx: this.smoothMouseX,
      my: this.smoothMouseY,
    };

    this.listeners.forEach((listener) => listener(state));

    this.raf = requestAnimationFrame(this.tick);
  };

  start() {
    if (this.running) return;

    this.running = true;
    this.smoothY = window.scrollY;

    if (window.matchMedia("(pointer: fine)").matches) {
      window.addEventListener("pointermove", this.onPointerMove, {
        passive: true,
      });
    }

    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;

    cancelAnimationFrame(this.raf);

    window.removeEventListener("pointermove", this.onPointerMove);
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}

const engine = new ScrollEngine();

/* ============================================================
   SCENE METADATA
   ============================================================ */

const SCENES = [
  {
    id: "story",
    label: "STORY",
    issue: "01",
  },
  {
    id: "city",
    label: "CITY",
    issue: "02",
  },
  {
    id: "fracture",
    label: "FRACTURE",
    issue: "03",
  },
  {
    id: "multiverse",
    label: "MULTIVERSE",
    issue: "04",
  },
  {
    id: "return",
    label: "RETURN",
    issue: "05",
  },
];

/* ============================================================
   HOOKS
   ============================================================ */

function useSceneProgress<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const unsubscribe = engine.subscribe(() => {
      const element = ref.current;

      if (!element) return;

      const rect = element.getBoundingClientRect();
      const vh = window.innerHeight || 1;

      const total = rect.height + vh;

      let progress = (vh - rect.top) / total;

      progress = Math.max(0, Math.min(1, progress));

      element.style.setProperty(
        "--scene-progress",
        progress.toFixed(4)
      );
    });

    return unsubscribe;
  }, []);

  return ref;
}

function useReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");

          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.2,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  return ref;
}

function useMagnetic<T extends HTMLElement>(strength = 16) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const onMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect();

      const mx =
        event.clientX -
        (rect.left + rect.width / 2);

      const my =
        event.clientY -
        (rect.top + rect.height / 2);

      element.style.transform = `
        translate3d(
          ${(mx / rect.width) * strength}px,
          ${(my / rect.height) * strength}px,
          0
        )
      `;
    };

    const onLeave = () => {
      element.style.transform =
        "translate3d(0,0,0)";
    };

    element.addEventListener(
      "pointermove",
      onMove
    );

    element.addEventListener(
      "pointerleave",
      onLeave
    );

    return () => {
      element.removeEventListener(
        "pointermove",
        onMove
      );

      element.removeEventListener(
        "pointerleave",
        onLeave
      );
    };
  }, [strength]);

  return ref;
}

function Reveal({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useReveal<HTMLDivElement>();

  return (
    <div
      ref={ref}
      className={`reveal ${className ?? ""}`}
      style={style}
    >
      {children}
    </div>
  );
}

/* ============================================================
   WEB THREAD
   ============================================================ */

function WebThread({
  d,
  dash = 900,
  className,
}: {
  d: string;
  dash?: number;
  className?: string;
}) {
  return (
    <svg
      className={`web-thread ${className ?? ""}`}
      preserveAspectRatio="none"
      viewBox="0 0 1440 900"
    >
      <path
        d={d}
        style={{
          strokeDasharray: dash,
          strokeDashoffset: `calc(${dash} - (${dash} * var(--scene-progress, 0)))`,
        }}
      />
    </svg>
  );
}

/* ============================================================
   CITY SILHOUETTE
   ============================================================ */

function CitySilhouette({
  className,
  seed,
}: {
  className?: string;
  seed: number;
}) {
  const width = 1440;

  const buildings: string[] = [];

  let x = 0;
  let index = 0;

  while (x < width) {
    const buildingWidth =
      60 + ((seed + index * 37) % 90);

    const buildingHeight =
      80 + ((seed + index * 53) % 220);

    buildings.push(
      `M${x},400
       L${x},${400 - buildingHeight}
       L${x + buildingWidth},${400 - buildingHeight}
       L${x + buildingWidth},400 Z`
    );

    x += buildingWidth + 6;
    index += 1;
  }

  return (
    <svg
      className={`city-svg ${className ?? ""}`}
      viewBox="0 0 1440 400"
      preserveAspectRatio="none"
    >
      <path d={buildings.join(" ")} />
    </svg>
  );
}

/* ============================================================
   FLOATING COLOR ORBS
   ============================================================ */

function ColorOrbs() {
  return (
    <div className="color-orbs" aria-hidden="true">
      <span className="orb orb-pink" />
      <span className="orb orb-orange" />
      <span className="orb orb-purple" />
      <span className="orb orb-cyan" />
    </div>
  );
}

/* ============================================================
   WEB SPLASH
   ============================================================ */

function WebSplash({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`web-splash ${className}`}
      aria-hidden="true"
    >
      <span />
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

/* ============================================================
   CUSTOM CURSOR
   ============================================================ */

function CustomCursor() {
  const dotRef =
    useRef<HTMLDivElement | null>(null);

  const ringRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;

    let rx = x;
    let ry = y;

    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
    };

    const onOver = (event: PointerEvent) => {
      const target =
        event.target as HTMLElement;

      const interactive =
        target.closest("[data-cursor]");

      const ring = ringRef.current;

      if (!ring) return;

      if (interactive) {
        ring.classList.add("cursor-active");

        ring.classList.toggle(
          "cursor-view",
          interactive.getAttribute(
            "data-cursor"
          ) === "view"
        );
      } else {
        ring.classList.remove(
          "cursor-active",
          "cursor-view"
        );
      }
    };

    window.addEventListener(
      "pointermove",
      onMove,
      {
        passive: true,
      }
    );

    window.addEventListener(
      "pointerover",
      onOver
    );

    let raf = 0;

    const loop = () => {
      rx += (x - rx) * 0.18;
      ry += (y - ry) * 0.18;

      const dot = dotRef.current;
      const ring = ringRef.current;

      if (dot) {
        dot.style.transform = `
          translate3d(${x}px, ${y}px, 0)
        `;
      }

      if (ring) {
        ring.style.transform = `
          translate3d(${rx}px, ${ry}px, 0)
        `;

        const speed = parseFloat(
          document.documentElement.style.getPropertyValue(
            "--scroll-speed"
          ) || "0"
        );

        ring.classList.toggle(
          "cursor-fast",
          speed > 0.45
        );
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener(
        "pointermove",
        onMove
      );

      window.removeEventListener(
        "pointerover",
        onOver
      );

      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        ref={dotRef}
        className="cursor-dot"
      />

      <div
        ref={ringRef}
        className="cursor-ring"
      />
    </>
  );
}

/* ============================================================
   NAV
   ============================================================ */

function Nav({
  active,
}: {
  active: number;
}) {
  const rootRef =
    useRef<HTMLElement | null>(null);

  const brandRef =
    useMagnetic<HTMLDivElement>(8);

  useEffect(() => {
    let lastSolid = false;

    const unsubscribe = engine.subscribe(
      (state) => {
        const solid = state.y > 40;

        if (
          solid !== lastSolid &&
          rootRef.current
        ) {
          rootRef.current.classList.toggle(
            "nav-solid",
            solid
          );

          lastSolid = solid;
        }
      }
    );

    return unsubscribe;
  }, []);

  const goTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  return (
    <nav
      ref={rootRef}
      className="hud-nav"
      data-cursor="view"
    >
      <div
        ref={brandRef}
        className="hud-brand"
      >
        GWEN
        <span>—</span>
        STACY
      </div>

      <div className="hud-links">
        {SCENES.map((scene, index) => (
          <button
            key={scene.id}
            className={`hud-link ${
              active === index
                ? "active"
                : ""
            }`}
            onClick={() =>
              goTo(scene.id)
            }
            data-cursor="view"
          >
            <b>{scene.issue}</b>
            <span className="hud-label">
              {scene.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}

/* ============================================================
   SCENE INDICATOR
   ============================================================ */

function SceneIndicator({
  active,
}: {
  active: number;
}) {
  const goTo = (id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  return (
    <div className="scene-indicator">
      {SCENES.map((scene, index) => (
        <div
          key={scene.id}
          className={`scene-dot ${
            active === index
              ? "active"
              : ""
          }`}
          onClick={() =>
            goTo(scene.id)
          }
          data-cursor="view"
        >
          <b />
          {scene.issue} — {scene.label}
        </div>
      ))}

      <div className="scene-indicator-track">
        <div className="scene-indicator-fill" />
      </div>
    </div>
  );
}

/* ============================================================
   HERO / STORY
   ============================================================ */

function HeroScene() {
  const ref =
    useSceneProgress<HTMLElement>();

  return (
    <section
      id="story"
      ref={ref}
      className="scene"
      style={{
        height: "340vh",
      }}
    >
      <div className="scene-pin hero-bg">
        <ColorOrbs />

        <div
          className="sun-glow"
          aria-hidden="true"
        />

        <div
          className="layer hero-stars"
          style={
            {
              "--depth": 0.02,
            } as CSSVars
          }
        />

        <div
          className="layer"
          style={
            {
              "--depth": 0.06,
              "--y-amt": -40,
            } as CSSVars
          }
        >
          <CitySilhouette
            seed={11}
            className="city-far"
          />
        </div>

        <div
          className="layer"
          style={
            {
              "--depth": 0.14,
              "--y-amt": -90,
            } as CSSVars
          }
        >
          <CitySilhouette
            seed={47}
            className="city-mid"
          />
        </div>

        <div
          className="layer"
          style={
            {
              "--depth": 0.24,
              "--y-amt": -140,
            } as CSSVars
          }
        >
          <CitySilhouette
            seed={83}
            className="city-near"
          />
        </div>

        <WebThread
          d="M -50 0 L 260 260 M 260 260 L 260 700"
          dash={1000}
        />

        <WebThread
          d="M 1500 40 L 1120 320 M 1120 320 L 1300 720"
          dash={1000}
        />

        <div className="hero-meta tl">
          <span className="pulse-dot" />
          EARTH-65 · LIVE FEED
        </div>

        <div className="hero-meta tr">
          ISSUE №01
          <br />
          SCROLL TO BEGIN ↓
        </div>

        <div className="hero-story-copy">
          <div className="story-kicker">
            <span>EARTH-65</span>
            <span>GWEN STACY</span>
            <span>ISSUE 001</span>
          </div>

          <p>
            EVERY STORY STARTS
            <br />
            WITH A SINGLE STEP.
          </p>
        </div>

        <div className="title-stack glitch-target">
          <h1
            className="title-line spider rgb-text"
            data-text="SPIDER"
            style={
              {
                "--dir": -1,
                "--travel": "26vw",
                "--lift": "16vh",
              } as CSSVars
            }
          >
            SPIDER
          </h1>

          <h1
            className="title-line gwen"
            style={
              {
                "--dir": 1,
                "--travel": "30vw",
                "--lift": "20vh",
              } as CSSVars
            }
          >
            GWEN
          </h1>
        </div>

        <p className="hero-sub">
          A cinematic portfolio of Gwen Stacy —
          creative developer, motion designer
          &amp; digital illustrator, swinging
          between code and comic art since
          Earth-65.
        </p>

        <div
          className="hero-portrait-wrap layer"
          style={
            {
              "--depth": 0.1,
            } as CSSVars
          }
        >
          <div className="portrait-aura" />

          <div className="comic-frame hero-frame">
            <img
              src={gwenPortrait}
              alt="Gwen Stacy portrait"
            />
          </div>
        </div>

        <div className="hero-memory">
          <span className="memory-line" />
          <span>
            BEFORE THE MASK
          </span>
        </div>

        <WebSplash className="hero-splash" />

        <div
          className="halftone"
          style={
            {
              "--halftone-opacity": 0.07,
            } as CSSVars
          }
        />

        <div className="scroll-cue">
          <span>ENTER THE STORY</span>
          <span className="line" />
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   CITY / GWEN IN BROOKLYN
   ============================================================ */

function CityScene() {
  const ref =
    useSceneProgress<HTMLElement>();

  const words = [
    {
      text: "MOVE.",
      t: 0.04,
      x: 80,
    },
    {
      text: "JUMP.",
      t: 0.2,
      x: -80,
    },
    {
      text: "FALL.",
      t: 0.38,
      x: 80,
    },
    {
      text: "RISE.",
      t: 0.56,
      x: -80,
      filled: true,
    },
  ];

  return (
    <section
      id="city"
      ref={ref}
      className="scene"
      style={{
        height: "280vh",
      }}
    >
      <div className="scene-pin city-bg">
        <ColorOrbs />

        <div className="city-sunset" />

        <div
          className="layer"
          style={
            {
              "--depth": 0.08,
              "--y-amt": -60,
            } as CSSVars
          }
        >
          <CitySilhouette
            seed={19}
            className="city-buildings-far"
          />
        </div>

        <div
          className="layer"
          style={
            {
              "--depth": 0.2,
              "--y-amt": -110,
            } as CSSVars
          }
        >
          <CitySilhouette
            seed={62}
            className="city-buildings-near"
          />
        </div>

        <WebThread
          d="M 1440 0 L 1040 260 M 1040 260 L 1200 620"
          dash={1000}
        />

        <div className="city-skyline-glow" />

        <div
          className="city-portrait layer"
          style={
            {
              "--depth": 0.16,
            } as CSSVars
          }
        >
          <div className="city-image-aura" />

          <div className="comic-frame city-frame">
            <img
              src={gwenSwing}
              alt="Gwen Stacy swinging through the city"
            />
          </div>

          <div className="image-note">
            <span>EARTH-65</span>
            <span>BROOKLYN</span>
          </div>
        </div>

        <div className="section-inner">
          <div className="city-copy">
            <Reveal>
              <span className="chapter-tag">
                CH.02 — BROOKLYN,
                EARTH-65 · SUNSET
              </span>
            </Reveal>

            <Reveal className="d1">
              <h2
                className="mega-heading city-heading"
              >
                The city
                <br />
                never sits
                <br />
                still.
              </h2>
            </Reveal>

            <Reveal className="d2">
              <p>
                Gwen moves through a city that
                never stops changing. Neon,
                music, rain, traffic, rooftops —
                every frame becomes part of the
                story.
              </p>
            </Reveal>

            <Reveal className="d3">
              <p className="story-quote">
                “Sometimes you don't know
                where you're going until
                you start moving.”
              </p>
            </Reveal>

            <Reveal className="d4">
              <div className="stat-row">
                <span className="stat-chip">
                  <b>01</b>
                  FRONTEND ENGINEERING
                </span>

                <span className="stat-chip">
                  <b>02</b>
                  MOTION DESIGN
                </span>

                <span className="stat-chip">
                  <b>03</b>
                  CREATIVE CODE
                </span>

                <span className="stat-chip">
                  <b>04</b>
                  DESIGN SYSTEMS
                </span>
              </div>
            </Reveal>
          </div>

          <div className="kinetic-row">
            {words.map((word) => (
              <div
                key={word.text}
                className={`kinetic-word ${
                  word.filled
                    ? "filled"
                    : ""
                }`}
                style={
                  {
                    "--kt": word.t,
                    "--kx": `${word.x}px`,
                  } as CSSVars
                }
              >
                {word.text}
              </div>
            ))}
          </div>
        </div>

        <div className="floating-spider">
          <span />
          <span />
          <span />
        </div>

        <div
          className="halftone"
          style={
            {
              "--halftone-opacity": 0.06,
              "--halftone-blend": "overlay",
            } as CSSVars
          }
        />
      </div>
    </section>
  );
}

/* ============================================================
   FRACTURE / EMOTIONAL TURN
   ============================================================ */

type PanelConfig = {
  id: string;
  style: CSSVars;
  content: ReactNode;
};

function FractureScene() {
  const ref =
    useSceneProgress<HTMLElement>();

  const panels: PanelConfig[] = [
    {
      id: "p1",
      style: {
        top: "10%",
        left: "8%",
        width: "34vw",
        height: "40vh",
        "--from-x": -900,
        "--from-y": -80,
        "--from-rot": -10,
        "--to-x": -620,
        "--to-y": 100,
        "--to-rot": -18,
      },
      content: (
        <div className="panel-img">
          <img
            src={gwenSwing}
            alt="Gwen Stacy project panel"
            style={{
              objectPosition:
                "50% 20%",
            }}
          />

          <div
            className="panel-tint pink"
          />

          <div className="panel-caption">
            <b>WEB WEAVER</b>
            interactive
            scroll-driven
            experiences
          </div>
        </div>
      ),
    },

    {
      id: "p2",
      style: {
        top: "7%",
        right: "7%",
        width: "27vw",
        height: "31vh",
        "--from-x": 900,
        "--from-y": -100,
        "--from-rot": 12,
        "--to-x": 680,
        "--to-y": -140,
        "--to-rot": 24,
      },
      content: (
        <div className="panel-solid">
          <span className="num">
            02
          </span>

          <span className="txt">
            INK &amp; CODE
          </span>

          <span className="panel-mini">
            BUILDING FROM THE CHAOS
          </span>
        </div>
      ),
    },

    {
      id: "p3",
      style: {
        bottom: "10%",
        left: "16%",
        width: "31vw",
        height: "35vh",
        "--from-x": -60,
        "--from-y": -800,
        "--from-rot": 5,
        "--to-x": -210,
        "--to-y": 580,
        "--to-rot": -15,
      },
      content: (
        <div className="panel-img">
          <img
            src={gwenAction}
            alt="Gwen Stacy multiverse project"
            style={{
              objectPosition:
                "50% 25%",
            }}
          />

          <div
            className="panel-tint cyan"
          />

          <div className="panel-caption">
            <b>
              MULTIVERSE ENGINE
            </b>
            animation &amp; motion
            systems
          </div>
        </div>
      ),
    },

    {
      id: "p4",
      style: {
        bottom: "7%",
        right: "10%",
        width: "25vw",
        height: "28vh",
        "--from-x": 80,
        "--from-y": 800,
        "--from-rot": -8,
        "--to-x": 300,
        "--to-y": -620,
        "--to-rot": 18,
      },
      content: (
        <div className="panel-solid alt">
          <span className="num">
            04
          </span>

          <span className="txt">
            SIGNAL / NOISE
          </span>

          <span className="panel-mini">
            FINDING THE PATTERN
          </span>
        </div>
      ),
    },
  ];

  return (
    <section
      id="fracture"
      ref={ref}
      className="scene"
      style={{
        height: "320vh",
      }}
    >
      <div className="scene-pin fracture-bg">
        <div className="fracture-light" />

        <div className="fracture-web">
          <WebThread
            d="M 0 700 L 400 400 M 1440 0 L 1000 380"
            dash={1000}
          />
        </div>

        <div className="fracture-heading">
          <span className="chapter-tag">
            CH.03 — THE FRACTURE
          </span>

          <h2 className="mega-heading">
            Sometimes
            <br />
            the story
            <br />
            breaks.
          </h2>

          <p className="fracture-sub">
            And that's where the interesting
            part begins.
          </p>
        </div>

        <div className="fracture-heart">
          <div className="heart-core">
            GWEN
          </div>
        </div>

        {panels.map((panel) => (
          <div
            key={panel.id}
            className="panel"
            style={panel.style}
          >
            {panel.content}
          </div>
        ))}

        <div className="fracture-word">
          KEEP
          <br />
          GOING
          <span>.</span>
        </div>

        <div
          className="halftone"
          style={
            {
              "--halftone-opacity": 0.08,
            } as CSSVars
          }
        />
      </div>
    </section>
  );
}

/* ============================================================
   MULTIVERSE
   ============================================================ */

function MultiverseScene() {
  const ref =
    useSceneProgress<HTMLElement>();

  const dimensions = [
    {
      earth: "EARTH-65",
      label: "FRONTEND ARCHITECTURE",
      tags: [
        "REACT",
        "JAVASCRIPT",
        "VITE",
        "TAILWIND",
      ],
      dir: 1,
      speed: 0.5,
      hue: 0,
      top: "2%",
    },

    {
      earth: "EARTH-616",
      label: "MOTION & INTERACTION",
      tags: [
        "CSS",
        "SVG",
        "ANIMATION",
        "INTERACTION",
      ],
      dir: -1,
      speed: 0.7,
      hue: 40,
      top: "26%",
    },

    {
      earth: "EARTH-928",
      label: "SYSTEMS & TOOLING",
      tags: [
        "NODE",
        "APIs",
        "PERFORMANCE",
        "CI/CD",
      ],
      dir: 1,
      speed: 0.4,
      hue: 200,
      top: "50%",
    },

    {
      earth: "EARTH-001",
      label: "VISUAL & BRAND DESIGN",
      tags: [
        "ILLUSTRATION",
        "ART DIRECTION",
        "TYPOGRAPHY",
      ],
      dir: -1,
      speed: 0.6,
      hue: 280,
      top: "74%",
    },
  ];

  return (
    <section
      id="multiverse"
      ref={ref}
      className="scene"
      style={{
        height: "280vh",
      }}
    >
      <div className="scene-pin multiverse-bg">
        <div className="multiverse-sunset" />

        <div className="multiverse-heading">
          <span className="chapter-tag">
            CH.04 — THE MULTIVERSE
          </span>

          <h2 className="mega-heading">
            Every earth.
            <br />
            A different
            <br />
            discipline.
          </h2>

          <p>
            Different worlds.
            <br />
            Same curiosity.
          </p>
        </div>

        {dimensions.map((dimension) => (
          <div
            key={dimension.earth}
            className="dimension"
            style={{
              top: dimension.top,
            }}
          >
            <div
              className="dimension-track"
              style={
                {
                  "--dir":
                    dimension.dir,
                  "--speed":
                    dimension.speed,
                  "--hue": `${dimension.hue}deg`,
                } as CSSVars
              }
            >
              {[0, 1, 2].map(
                (repeat) => (
                  <div
                    className="dimension-item"
                    key={repeat}
                  >
                    {dimension.earth}

                    <small>
                      {
                        dimension.label
                      }
                    </small>

                    {dimension.tags.map(
                      (tag) => (
                        <small
                          key={tag}
                        >
                          {tag}
                        </small>
                      )
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        ))}

        <div className="multiverse-core">
          <div className="core-ring ring-one" />
          <div className="core-ring ring-two" />

          <div className="comic-frame">
            <img
              src={gwenAction}
              alt="Gwen Stacy across the multiverse"
            />
          </div>
        </div>

        <div className="web-cross">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div
          className="halftone"
          style={
            {
              "--halftone-opacity": 0.06,
            } as CSSVars
          }
        />
      </div>
    </section>
  );
}

/* ============================================================
   FINALE / RETURN
   ============================================================ */

function FinaleScene() {
  const buttonRef =
    useMagnetic<HTMLAnchorElement>(14);

  return (
    <section
      id="return"
      className="scene scene-flow finale-bg"
    >
      <div className="finale-sunset" />

      <WebThread
        d="M 0 0 L 300 200 M 1440 0 L 1140 220"
        dash={900}
      />

      <div className="finale-web-orbit" />

      <div className="finale-wrap">
        <Reveal>
          <span className="chapter-tag">
            CH.05 — RETURN
          </span>
        </Reveal>

        <Reveal className="d1">
          <div className="finale-portrait">
            <div className="finale-glow" />

            <img
              src={gwenPortrait}
              alt="Gwen Stacy"
            />
          </div>
        </Reveal>

        <Reveal className="d2">
          <p className="finale-kicker">
            THE STORY DOESN'T END HERE
          </p>

          <h2 className="finale-title">
            TO BE
            <br />
            <span className="accent">
              CONTINUED...
            </span>
          </h2>
        </Reveal>

        <Reveal className="d3">
          <p className="finale-copy">
            Every project is another universe.
            <br />
            Every interaction is another
            panel.
            <br />
            Keep scrolling. Keep building.
          </p>
        </Reveal>

        <Reveal className="d3">
          <a
            ref={buttonRef}
            href="mailto:hello@gwenstacy.dev"
            className="btn-comic"
            data-cursor="view"
          >
            SUMMON GWEN →
          </a>
        </Reveal>

        <Reveal className="d4">
          <div className="social-row">
            <a
              className="social-pill"
              href="#"
              data-cursor="view"
              aria-label="GitHub"
            >
              GH
            </a>

            <a
              className="social-pill"
              href="#"
              data-cursor="view"
              aria-label="LinkedIn"
            >
              IN
            </a>

            <a
              className="social-pill"
              href="#"
              data-cursor="view"
              aria-label="Twitter"
            >
              X
            </a>
          </div>

          <p className="footer-print">
            © 2026 GWEN STACY — EARTH-65
            <br />
            ALL PANELS DRAWN BY HAND
            (AND REACT)
          </p>
        </Reveal>
      </div>
    </section>
  );
}

/* ============================================================
   APP
   ============================================================ */

export default function App() {
  const [isTouch] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(
        "(pointer: coarse)"
      ).matches
  );

  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
  );

  const [active, setActive] =
    useState(0);

  useEffect(() => {
    engine.start();

    return () => engine.stop();
  }, []);

  useEffect(() => {
    const ids = SCENES.map(
      (scene) => scene.id
    );

    const elements = ids
      .map((id) =>
        document.getElementById(id)
      )
      .filter(
        (
          element
        ): element is HTMLElement =>
          !!element
      );

    const observer =
      new IntersectionObserver(
        (entries) => {
          entries.forEach(
            (entry) => {
              if (
                !entry.isIntersecting
              )
                return;

              const index =
                ids.indexOf(
                  entry.target.id
                );

              if (index !== -1) {
                setActive(index);
              }
            }
          );
        },
        {
          threshold: 0.5,
        }
      );

    elements.forEach((element) =>
      observer.observe(element)
    );

    return () =>
      observer.disconnect();
  }, []);

  return (
    <div
      className="site"
      data-touch={isTouch}
      data-reduced-motion={
        reducedMotion
      }
    >
      {!isTouch && <CustomCursor />}

      <div className="grain" />
      <div className="scanlines" />
      <div className="speedlines" />
      <div className="vignette" />

      <Nav active={active} />

      <SceneIndicator
        active={active}
      />

      <main>
        <HeroScene />
        <CityScene />
        <FractureScene />
        <MultiverseScene />
        <FinaleScene />
      </main>
    </div>
  );
}