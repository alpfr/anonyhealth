/**
 * AnonyHealth — Clinical Architecture & Workflow Simulation Engine
 * =================================================================
 * Provides interactive, automated, and sandbox demonstrations of:
 * - Anonymous patient entry (zero PII, zero tracking)
 * - Jev System 1 Deterministic Reflex Screening (0ms, $0 cost)
 * - Bilingual Spanish & FAST emergency intercepts
 * - AI Clinical multi-agent triage
 * - Doctor clinical review, SOAP note generation, CPT billing, & FHIR R4
 */

// ─── 1. Jev System 1 Clinical Reflex Definitions ─────────────────
const RED_FLAGS = [
  {
    code: "ACUTE_CORONARY_SYNDROME",
    regex: /\b(crushing|radiat(ing|es)|squeezing|pressure|heavy)\b.*\b(chest|heart|sternum)\b/i,
    title: "Possible Acute Cardiac Event",
    detail: "Chest pain radiating to the jaw, neck, arm, or associated with diaphoresis requires immediate emergency intervention.",
    risk: "CRITICAL",
    score: 98,
    cpt: "99423",
    icd: "I20.9 (Angina pectoris, unspecified)"
  },
  {
    code: "CHEST_PAIN_EMERGENCY",
    regex: /\b(chest pain|heart attack|angina)\b/i,
    title: "Acute Chest Discomfort",
    detail: "Sudden onset chest pain cannot be safely triaged online.",
    risk: "CRITICAL",
    score: 95,
    cpt: "99423",
    icd: "R07.9 (Chest pain, unspecified)"
  },
  {
    code: "ACUTE_CORONARY_SYNDROME_ES",
    regex: /\b(dolor|opresi[oó]n|presi[oó]n|pesadez)\b.*\b(pecho|coraz[oó]n|estern[oó]n)\b/i,
    title: "Posible Evento Cardíaco Agudo (Emergency)",
    detail: "El dolor opresivo en el pecho requiere atención médica de emergencia inmediata (911).",
    risk: "CRITICAL",
    score: 98,
    cpt: "99423",
    icd: "I20.9 (Angina de pecho)"
  },
  {
    code: "PEDIATRIC_NEONATAL_FEVER",
    regex: /\b(newborn|neonate|infant|[0-8]\s*weeks?|baby)\b.*\b(fever|temp|temperature|10[0-9]\.?\d?)\b/i,
    title: "Neonatal Fever Emergency (<60 Days)",
    detail: "Fever in infants under 60 days of age requires immediate emergency evaluation to rule out serious bacterial infection (sepsis/meningitis).",
    risk: "CRITICAL",
    score: 99,
    cpt: "99423",
    icd: "R50.9 (Fever in infant, unspecified)"
  },
  {
    code: "STROKE_FAST",
    regex: /\b(facial droop|slurred speech|arm weakness|cant speak|words dont make sense)\b/i,
    title: "Stroke Indicator (FAST Protocol)",
    detail: "Acute focal neurological deficit warrants immediate 911 dispatch within the thrombolytic window.",
    risk: "CRITICAL",
    score: 99,
    cpt: "99423",
    icd: "I63.9 (Cerebral infarction)"
  }
];

// ─── 2. Preset Simulation Scenarios ──────────────────────────────
const SCENARIOS = {
  cardiac: {
    id: "cardiac",
    name: "🚨 Cardiac Emergency (EN)",
    symptom: "I have severe crushing chest pain radiating to my left arm",
    patientName: "Anonymous Patient (ID: 0x7b2f...)",
    narrativeTitle: "Acute Coronary Syndrome Intercept",
    narrativeDesc: "Notice how Jev System 1 evaluates in sub-milliseconds client-side, bypassing all LLMs and launching emergency 911/988 hotlines with 0ms latency and $0 token cost.",
    isEmergency: true
  },
  spanish: {
    id: "spanish",
    name: "🇪🇸 Dolor en Pecho (ES)",
    symptom: "Tengo un dolor muy fuerte en el pecho y me falta el aire",
    patientName: "Paciente Anónimo (ID: 0x3d9a...)",
    narrativeTitle: "Bilingual Spanish Clinical Safety Intercept",
    narrativeDesc: "Jev System 1 features native bilingual pattern recognition. Spanish medical emergencies trigger instant localized safety modals without translation delay.",
    isEmergency: true
  },
  pediatric: {
    id: "pediatric",
    name: "👶 Neonatal Fever (<60d)",
    symptom: "My 3-week-old newborn baby has a rectal temperature of 101.5°F",
    patientName: "Anonymous Parent (ID: 0x9e12...)",
    narrativeTitle: "Pediatric Neonatal Fever Alert",
    narrativeDesc: "Infants under 60 days with fever require immediate in-person sepsis workup. Jev System 1 prevents improper at-home triage and directs to pediatric ER.",
    isEmergency: true
  },
  headache: {
    id: "headache",
    name: "🤕 Tension Headache (Routine AI)",
    symptom: "Dull pressure headache across my forehead and slight eyestrain for two days",
    patientName: "Anonymous Patient (ID: 0x4a8c...)",
    narrativeTitle: "Multi-Agent Non-Emergent AI Triage",
    narrativeDesc: "Non-emergent symptoms pass safely to AI reasoning agents (Intake, Differential Diagnostic, Safety Arbiter) to form a clinical care summary.",
    isEmergency: false
  }
};

// ─── 3. Story Mode Walkthrough Steps ─────────────────────────────
const STORY_STEPS = [
  {
    num: 1,
    title: "1. Anonymous Intake",
    tag: "intake",
    heading: "Zero-Knowledge Anonymous Entry",
    text: "Patients access HIPAA-grade triage instantly without email, password, or device tracking. Zero personal identifiers are stored."
  },
  {
    num: 2,
    title: "2. Jev Reflex (0ms)",
    tag: "reflex",
    heading: "Deterministic Emergency Intercept",
    text: "Client-side regex & WASM rules screen high-acuity red flags in 0.3ms with $0 token cost, intercepting cardiac/stroke symptoms before AI calls."
  },
  {
    num: 3,
    title: "3. Dual-Vault Privacy",
    tag: "vault",
    heading: "Cryptographic Dual-Vault Architecture",
    text: "Patient identity tokens and encrypted clinical context are separated into dual vaults, guaranteeing zero-trace privacy."
  },
  {
    num: 4,
    title: "4. Multi-Agent AI",
    tag: "agents",
    heading: "Multi-Agent Clinical Evaluation",
    text: "Non-emergent symptoms are processed by specialized Intake, Diagnostic, and Arbiter agents to assign Jev Risk Bands (LOW to CRITICAL)."
  },
  {
    num: 5,
    title: "5. Doctor Review & FHIR",
    tag: "doctor",
    heading: "1-Click SOAP Note & EHR Ingestion",
    text: "Healthcare providers receive pre-formatted SOAP notes, telehealth billing codes (CPT 99421-99423), and HL7 FHIR R4 Bundle exports."
  }
];

// ─── 4. Simulation Engine State ──────────────────────────────────
class SimulationEngine {
  constructor() {
    this.currentStep = 0;
    this.currentScenario = SCENARIOS.cardiac;
    this.isPlaying = false;
    this.playbackSpeed = 1;
    this.activeView = "dual";
    this.activeDashTab = "soap";
    this.timer = null;
    this.theme = "dark";
    
    this.initDOM();
    this.attachEventListeners();
    this.applyTheme(this.theme);
    this.renderStep(0);
  }

  initDOM() {
    this.dom = {
      themeToggle: document.getElementById("themeToggle"),
      viewOpts: document.querySelectorAll(".btn-view-opt"),
      simStage: document.querySelector(".sim-stage"),
      stepsContainer: document.getElementById("stepsContainer"),
      narrativeIcon: document.getElementById("narrativeIcon"),
      narrativeTitle: document.getElementById("narrativeTitle"),
      narrativeDesc: document.getElementById("narrativeDesc"),
      btnPlayPause: document.getElementById("btnPlayPause"),
      btnPrev: document.getElementById("btnPrev"),
      btnNext: document.getElementById("btnNext"),
      btnReset: document.getElementById("btnReset"),
      scenarioChips: document.querySelectorAll(".scenario-chip"),
      // Phone elements
      phoneScreenContent: document.getElementById("phoneScreenContent"),
      // Dashboard elements
      dashTabs: document.querySelectorAll(".dash-tab-btn"),
      metricLatency: document.getElementById("metricLatency"),
      metricCost: document.getElementById("metricCost"),
      metricRisk: document.getElementById("metricRisk"),
      metricRule: document.getElementById("metricRule"),
      riskPill: document.getElementById("riskPill"),
      dashContentBody: document.getElementById("dashContentBody"),
      btnCopyContent: document.getElementById("btnCopyContent")
    };
  }

  attachEventListeners() {
    // Theme toggle
    this.dom.themeToggle?.addEventListener("click", () => {
      this.theme = this.theme === "dark" ? "light" : "dark";
      this.applyTheme(this.theme);
    });

    // View options (Dual, Patient, Doctor)
    this.dom.viewOpts.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const view = e.currentTarget.dataset.view;
        this.setView(view);
      });
    });

    // Story navigation
    this.dom.btnPlayPause?.addEventListener("click", () => this.togglePlayPause());
    this.dom.btnPrev?.addEventListener("click", () => this.prevStep());
    this.dom.btnNext?.addEventListener("click", () => this.nextStep());
    this.dom.btnReset?.addEventListener("click", () => this.resetSimulation());

    // Scenario selection chips
    this.dom.scenarioChips.forEach((chip) => {
      chip.addEventListener("click", (e) => {
        const id = e.currentTarget.dataset.scenario;
        if (SCENARIOS[id]) {
          this.setScenario(SCENARIOS[id]);
        }
      });
    });

    // Dashboard tabs
    this.dom.dashTabs.forEach((tab) => {
      tab.addEventListener("click", (e) => {
        const targetTab = e.currentTarget.dataset.tab;
        this.setDashTab(targetTab);
      });
    });

    // Copy button
    this.dom.btnCopyContent?.addEventListener("click", () => {
      this.copyCurrentContent();
    });
  }

  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    if (this.dom.themeToggle) {
      this.dom.themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    }
  }

  setView(view) {
    this.activeView = view;
    this.dom.viewOpts.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === view);
    });
    this.dom.simStage.setAttribute("data-view", view);
  }

  setScenario(scenario) {
    this.currentScenario = scenario;
    this.dom.scenarioChips.forEach((chip) => {
      chip.classList.toggle("active", chip.dataset.scenario === scenario.id);
    });
    // Jump to reflex evaluation step with this scenario
    this.currentStep = 1;
    this.renderStep(1);
  }

  setDashTab(tab) {
    this.activeDashTab = tab;
    this.dom.dashTabs.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tab);
    });
    this.renderDashboardContent();
  }

  togglePlayPause() {
    this.isPlaying = !this.isPlaying;
    this.updatePlayPauseUI();
    if (this.isPlaying) {
      this.scheduleNextStep();
    } else {
      clearTimeout(this.timer);
    }
  }

  updatePlayPauseUI() {
    if (this.dom.btnPlayPause) {
      this.dom.btnPlayPause.innerHTML = this.isPlaying
        ? "<span>⏸️</span> Pause Tour"
        : "<span>▶️</span> Auto-Play Tour";
    }
  }

  nextStep() {
    clearTimeout(this.timer);
    if (this.currentStep < STORY_STEPS.length - 1) {
      this.currentStep++;
      this.renderStep(this.currentStep);
      if (this.isPlaying) this.scheduleNextStep();
    } else {
      this.isPlaying = false;
      this.updatePlayPauseUI();
    }
  }

  prevStep() {
    clearTimeout(this.timer);
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep(this.currentStep);
      if (this.isPlaying) this.scheduleNextStep();
    }
  }

  resetSimulation() {
    clearTimeout(this.timer);
    this.isPlaying = false;
    this.updatePlayPauseUI();
    this.currentStep = 0;
    this.renderStep(0);
  }

  scheduleNextStep() {
    clearTimeout(this.timer);
    const delay = 6500 / this.playbackSpeed;
    this.timer = setTimeout(() => {
      if (this.currentStep < STORY_STEPS.length - 1) {
        this.nextStep();
      } else {
        this.isPlaying = false;
        this.updatePlayPauseUI();
      }
    }, delay);
  }

  renderStep(index) {
    this.currentStep = index;
    const step = STORY_STEPS[index];

    // Update Story Steps bar
    const stepItems = document.querySelectorAll(".story-step-item");
    stepItems.forEach((el, i) => {
      el.classList.toggle("active", i === index);
      el.classList.toggle("completed", i < index);
    });

    // Update narrative banner
    if (this.dom.narrativeTitle) this.dom.narrativeTitle.textContent = step.heading;
    if (this.dom.narrativeDesc) this.dom.narrativeDesc.textContent = step.text;

    // Render Phone Screen state
    this.renderPhoneState(index);

    // Render Dashboard & Telemetry
    this.renderTelemetry(index);
    this.renderDashboardContent();
  }

  // ─── 5. Phone View Rendering ──────────────────────────────────
  renderPhoneState(stepIndex) {
    const container = this.dom.phoneScreenContent;
    if (!container) return;

    if (stepIndex === 0) {
      // Step 1: Anonymous Intake Landing
      container.innerHTML = `
        <div class="patient-anon-banner">
          <span class="patient-anon-badge">🔒 Anonymous Mode Active</span>
          <span style="font-size: 10px; color: var(--text-dim);">No PII Stored</span>
        </div>
        <div class="patient-topbar">
          <div style="font-weight: 700; font-size: 15px; color: var(--text-main);">AnonyHealth</div>
          <div style="font-size: 11px; background: rgba(37, 99, 235, 0.15); color: #38bdf8; padding: 3px 8px; border-radius: 9999px;">Encrypted</div>
        </div>
        <div class="intake-card">
          <div class="intake-logo-circle">🛡️</div>
          <div class="intake-title">Talk to AI Triage, Privately</div>
          <div class="intake-sub">No account needed. Your health symptoms are processed with zero-knowledge encryption and ephemeral session tokens.</div>
          <button class="btn-anon-cta pulse" id="btnPhoneStartAnon">
            Continue Anonymously →
          </button>
        </div>
        <div style="margin: 0 16px; padding: 14px; background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px;">
          <div style="font-size: 12px; font-weight: 600; margin-bottom: 6px;">Zero-Trace Guarantees:</div>
          <div style="font-size: 11px; color: var(--text-muted); line-height: 1.5;">
            ✓ No registration or email required<br>
            ✓ No IP address logging<br>
            ✓ Dual-vault cryptographic separation
          </div>
        </div>
      `;

      document.getElementById("btnPhoneStartAnon")?.addEventListener("click", () => {
        this.nextStep();
      });

    } else if (stepIndex === 1) {
      // Step 2: Cardiac Emergency & Jev Reflex Modal
      const scenario = this.currentScenario;
      container.innerHTML = `
        <div class="patient-topbar">
          <div style="font-weight: 700; font-size: 14px; color: var(--text-main);">AI Triage Assistant</div>
          <div style="font-size: 11px; color: #10b981;">● Online</div>
        </div>
        <div class="chat-transcript-area">
          <div class="chat-bubble bot">
            Hello. I'm your confidential AI triage assistant. How can I help you today?
          </div>
          <div class="chat-bubble user">
            ${scenario.symptom}
          </div>
        </div>
        <div class="chat-input-bar">
          <input type="text" class="chat-input-field" value="Assessment complete" disabled />
          <button class="chat-send-btn" disabled>🔒</button>
        </div>
        <div class="emergency-modal-overlay" id="simEmergencyModal">
          <div class="emergency-modal-card">
            <div class="modal-siren-icon">🚨</div>
            <div class="modal-title-red">JEV SYSTEM 1 CLINICAL INTERCEPT</div>
            <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">Possible Acute Cardiac Event</div>
            <div class="modal-desc-box">
              Immediate In-Person Care Required. Chest pain radiating to the arm, jaw, or neck cannot be triaged online.
            </div>
            <button class="modal-action-911" onclick="alert('Demo: Initiating emergency call to 911 dispatch.')">
              📞 Call 911 Emergency Services
            </button>
            <button class="modal-action-988" onclick="alert('Demo: Connecting to 988 Suicide & Crisis Lifeline.')">
              💬 Call / Text 988 Crisis Lifeline
            </button>
            <div class="modal-poison-text">Poison Control: 1-800-222-1222</div>
            <button class="modal-dismiss-btn" id="btnDismissModal">I am already receiving medical care / close warning</button>
          </div>
        </div>
      `;

      document.getElementById("btnDismissModal")?.addEventListener("click", () => {
        const modal = document.getElementById("simEmergencyModal");
        if (modal) modal.style.display = "none";
      });

    } else if (stepIndex === 2) {
      // Step 3: Bilingual Spanish & FAST Stroke Reflex
      container.innerHTML = `
        <div class="patient-topbar">
          <div style="font-weight: 700; font-size: 14px; color: var(--text-main);">Asistente Clínico Bilingüe</div>
          <div style="font-size: 11px; color: #10b981;">● En línea</div>
        </div>
        <div class="chat-transcript-area">
          <div class="chat-bubble bot">
            ¿En qué puedo ayudarle hoy?
          </div>
          <div class="chat-bubble user">
            Tengo un dolor muy fuerte en el pecho y me falta el aire
          </div>
          <div class="chat-bubble emergency-intercept">
            <div class="emergency-bubble-header">
              <span>🚨</span> INTERCEPCIÓN CLÍNICA DE EMERGENCIA
            </div>
            <div style="font-size: 12px; line-height: 1.4; margin-bottom: 8px;">
              Sus síntomas indican un riesgo cardiovascular agudo. No espere por este chat. Llame inmediatamente a emergencias (911).
            </div>
            <div class="emergency-bubble-actions">
              <button class="emergency-btn-red" onclick="alert('Marcando al 911...')">Llamar 911</button>
              <button class="emergency-btn-gray" onclick="alert('Línea 988')">Línea 988</button>
            </div>
          </div>
        </div>
        <div class="chat-input-bar">
          <input type="text" class="chat-input-field" value="Evaluación de emergencia activa" disabled />
          <button class="chat-send-btn" disabled>🔒</button>
        </div>
      `;

    } else if (stepIndex === 3) {
      // Step 4: Non-Emergent Routine Triage (Tension Headache)
      container.innerHTML = `
        <div class="patient-topbar">
          <div style="font-weight: 700; font-size: 14px; color: var(--text-main);">AI Triage Assistant</div>
          <div style="font-size: 11px; color: #10b981;">● Low Risk</div>
        </div>
        <div class="chat-transcript-area">
          <div class="chat-bubble user">
            Dull pressure headache across my forehead and slight eyestrain for two days
          </div>
          <div class="chat-bubble bot">
            <div style="font-weight: 700; font-size: 12px; color: #38bdf8; margin-bottom: 4px;">● Multi-Agent Clinical Assessment</div>
            Based on your description of a non-pulsatile, dull bilateral headache without fever, vision changes, or neck stiffness:
            <br><br>
            <strong>Primary Consideration:</strong> Tension-type headache / digital eyestrain.<br>
            <strong>Jev Risk Score:</strong> 14/100 (LOW RISK)<br>
            <strong>Guidance:</strong> Rest in a low-light room, maintain hydration, and consider over-the-counter analgesics as advised by your physician. If symptoms persist beyond 72 hours, schedule a telehealth consultation.
          </div>
        </div>
        <div class="chat-input-bar">
          <input type="text" class="chat-input-field" placeholder="Ask a follow up question..." id="phoneCustomInput" />
          <button class="chat-send-btn" id="btnPhoneSend">➤</button>
        </div>
      `;

      const input = document.getElementById("phoneCustomInput");
      const sendBtn = document.getElementById("btnPhoneSend");
      sendBtn?.addEventListener("click", () => {
        if (input && input.value.trim()) {
          this.handleCustomSymptom(input.value.trim());
        }
      });
      input?.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && input.value.trim()) {
          this.handleCustomSymptom(input.value.trim());
        }
      });

    } else if (stepIndex === 4) {
      // Step 5: Doctor Handoff & Patient Summary
      container.innerHTML = `
        <div class="patient-topbar">
          <div style="font-weight: 700; font-size: 14px; color: var(--text-main);">Clinical Intake Transferred</div>
          <div style="font-size: 11px; background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 8px; border-radius: 9999px;">Shared with Doctor</div>
        </div>
        <div style="padding: 16px;">
          <div style="background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
            <div style="font-size: 13px; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">Encrypted Clinical Record Created</div>
            <div style="font-size: 12px; color: var(--text-muted); line-height: 1.5;">
              Your triage summary has been anonymized and pushed to your provider's clinical dashboard. No identity tokens were compromised.
            </div>
          </div>
          <div style="background: rgba(37, 99, 235, 0.1); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: 12px; padding: 14px; text-align: center;">
            <div style="font-size: 14px; font-weight: 700; margin-bottom: 4px;">Ready to Book Consultation?</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">Dr. Evelyn Reed has received the clinical SOAP draft.</div>
            <button class="sim-btn" style="width: 100%; justify-content: center;" onclick="alert('Demo: Booking telehealth appointment.')">
              Schedule Video Telehealth Check →
            </button>
          </div>
        </div>
      `;
    }
  }

  // ─── 6. Custom Sandbox Evaluation ──────────────────────────────
  handleCustomSymptom(text) {
    const t0 = performance.now();
    let matched = null;
    for (const flag of RED_FLAGS) {
      if (flag.regex.test(text)) {
        matched = flag;
        break;
      }
    }
    const t1 = performance.now();
    const elapsedMs = (t1 - t0).toFixed(2);

    if (matched) {
      this.currentScenario = {
        id: "custom",
        name: "Custom Input",
        symptom: text,
        patientName: "Anonymous Patient (ID: 0xCustom)",
        narrativeTitle: matched.title,
        narrativeDesc: `Jev System 1 intercepted this custom symptom deterministically in ${elapsedMs}ms with $0 token cost.`,
        isEmergency: true,
        matchedRule: matched
      };
      this.currentStep = 1;
      this.renderStep(1);
    } else {
      this.currentScenario = {
        id: "custom_benign",
        name: "Custom Input",
        symptom: text,
        patientName: "Anonymous Patient (ID: 0xCustom)",
        narrativeTitle: "Non-Emergent Clinical Triage",
        narrativeDesc: `Jev System 1 cleared red flags in ${elapsedMs}ms. Passing to multi-agent reasoning.`,
        isEmergency: false
      };
      this.currentStep = 3;
      this.renderStep(3);
    }
  }

  // ─── 7. Telemetry & Metric Gauges ───────────────────────────────
  renderTelemetry(stepIndex) {
    const isEmergent = stepIndex === 1 || stepIndex === 2;
    const isBenign = stepIndex === 3;
    const isIntake = stepIndex === 0;

    if (this.dom.metricLatency) {
      this.dom.metricLatency.innerHTML = isIntake
        ? `0.00ms <span class="metric-badge green">IDLE</span>`
        : isEmergent
        ? `0.28ms <span class="metric-badge green">SYSTEM 1</span>`
        : `142ms <span class="metric-badge cyan">SYSTEM 2 AI</span>`;
    }

    if (this.dom.metricCost) {
      this.dom.metricCost.innerHTML = isEmergent || isIntake
        ? `$0.0000 <span class="metric-badge green">100% FREE</span>`
        : `$0.0008 <span class="metric-badge cyan">LLM TOKEN</span>`;
    }

    if (this.dom.metricRisk) {
      this.dom.metricRisk.innerHTML = isEmergent
        ? `CRITICAL <span class="metric-badge red">98/100</span>`
        : isBenign
        ? `LOW RISK <span class="metric-badge green">14/100</span>`
        : `PENDING <span class="metric-badge cyan">--/100</span>`;
    }

    if (this.dom.metricRule) {
      this.dom.metricRule.textContent = isEmergent
        ? `REGEX: ${this.currentScenario.id.toUpperCase()}_RED_FLAG`
        : isBenign
        ? `MULTI-AGENT TRIAGE: BENIGN_CLEAR`
        : `WAITING_INPUT`;
    }

    if (this.dom.riskPill) {
      if (isEmergent) {
        this.dom.riskPill.className = "risk-band-pill critical";
        this.dom.riskPill.textContent = "CRITICAL RISK (98)";
      } else if (isBenign) {
        this.dom.riskPill.className = "risk-band-pill low";
        this.dom.riskPill.textContent = "LOW RISK (14)";
      } else {
        this.dom.riskPill.className = "risk-band-pill moderate";
        this.dom.riskPill.textContent = "INSPECTION ACTIVE";
      }
    }
  }

  // ─── 8. Right Pane Clinical Dashboard Rendering ────────────────
  renderDashboardContent() {
    const container = this.dom.dashContentBody;
    if (!container) return;

    const tab = this.activeDashTab;
    const scenario = this.currentScenario;
    const isEmergent = this.currentStep === 1 || this.currentStep === 2;

    if (tab === "soap") {
      container.innerHTML = `
        <div class="soap-note-container">
          <div class="soap-section">
            <span class="soap-letter">S</span><strong>SUBJECTIVE (Patient Stated):</strong>
            <div class="soap-body">
              "${scenario.symptom}". Patient entered via anonymous zero-trace session. No reported prior history available.
            </div>
          </div>
          <div class="soap-section">
            <span class="soap-letter">O</span><strong>OBJECTIVE (Clinical Vitals / Triage Observation):</strong>
            <div class="soap-body">
              ${isEmergent
                ? "Physical appearance: Remote mobile interaction. Triage red flag activated deterministically: Crushing retrosternal chest pain with left extremity radiation."
                : "Physical appearance: Remote mobile interaction. Patient denies visual aura, photophobia, fever, or neck stiffness."
              }
            </div>
          </div>
          <div class="soap-section">
            <span class="soap-letter">A</span><strong>ASSESSMENT (Diagnostic Differential & Risk Score):</strong>
            <div class="soap-body">
              ${isEmergent
                ? "Primary: Rule out Acute Coronary Syndrome (ACS) / Acute Myocardial Infarction. Jev Clinical Risk Band: <strong>CRITICAL (Score: 98/100)</strong>. Secondary: Unstable Angina."
                : "Primary: Tension-type headache (85% confidence). Jev Clinical Risk Band: <strong>LOW (Score: 14/100)</strong>. Secondary: Digital eyestrain (15%)."
              }
            </div>
          </div>
          <div class="soap-section">
            <span class="soap-letter">P</span><strong>PLAN (Clinical Action & Follow-Up):</strong>
            <div class="soap-body">
              ${isEmergent
                ? "1. Emergency intercept executed immediately; patient directed to dial 911 / EMS dispatch.<br>2. 988 Crisis and Poison Control hotlines displayed.<br>3. Advised patient to rest in seated position, avoid exertion, and await emergency transport."
                : "1. Advise patient on ergonomic adjustments and hydration.<br>2. Recommend OTC analgesic (Acetaminophen/Ibuprofen) if indicated.<br>3. Telehealth follow-up in 48h if symptoms fail to resolve."
              }
            </div>
          </div>
        </div>
      `;

    } else if (tab === "fhir") {
      const fhirJson = {
        resourceType: "Bundle",
        id: "bundle-anonyhealth-" + Math.floor(Math.random() * 899999 + 100000),
        type: "collection",
        timestamp: new Date().toISOString(),
        entry: [
          {
            resource: {
              resourceType: "Patient",
              id: "anon-pat-" + Math.floor(Math.random() * 8999 + 1000),
              active: true,
              name: [{ use: "anonymous", text: "Anonymous Patient" }]
            }
          },
          {
            resource: {
              resourceType: "Encounter",
              id: "enc-triage-01",
              status: isEmergent ? "triaged" : "finished",
              class: {
                system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                code: "VR",
                display: "Virtual Telehealth"
              },
              priority: {
                coding: [{
                  system: "http://terminology.hl7.org/CodeSystem/v3-ActPriority",
                  code: isEmergent ? "EM" : "R",
                  display: isEmergent ? "Emergency" : "Routine"
                }]
              }
            }
          },
          {
            resource: {
              resourceType: "Condition",
              id: "cond-01",
              clinicalStatus: {
                coding: [{ code: "active", display: "Active" }]
              },
              code: {
                coding: [{
                  system: "http://hl7.org/fhir/sid/icd-10-cm",
                  code: isEmergent ? "I20.9" : "R51.9",
                  display: isEmergent ? "Angina pectoris, unspecified" : "Headache, unspecified"
                }]
              }
            }
          }
        ]
      };

      container.innerHTML = `
        <div class="code-viewer-container">${JSON.stringify(fhirJson, null, 2)}</div>
      `;

    } else if (tab === "billing") {
      container.innerHTML = `
        <div class="billing-grid">
          <div class="billing-card" style="border-left: 4px solid var(--accent-emerald);">
            <div class="cpt-title">CPT 99421</div>
            <div class="cpt-rate">$15.52</div>
            <div class="cpt-desc">Online digital evaluation & management service, for an established patient, for up to 7 days, cumulative time: <strong>5–10 minutes</strong>.</div>
          </div>
          <div class="billing-card" style="border-left: 4px solid var(--accent-cyan);">
            <div class="cpt-title">CPT 99422</div>
            <div class="cpt-rate">$31.04</div>
            <div class="cpt-desc">Online digital evaluation & management service, for an established patient, for up to 7 days, cumulative time: <strong>11–20 minutes</strong>.</div>
          </div>
          <div class="billing-card" style="border-left: 4px solid var(--primary);">
            <div class="cpt-title">CPT 99423</div>
            <div class="cpt-rate">$46.56</div>
            <div class="cpt-desc">Online digital evaluation & management service, cumulative time: <strong>21+ minutes</strong>. Auto-suggested for complex/emergent triage reviews.</div>
          </div>
        </div>
        <div style="background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 10px; padding: 14px; margin-top: 12px;">
          <div style="font-size: 12px; font-weight: 700; color: #38bdf8; margin-bottom: 4px;">Primary ICD-10 Diagnostic Suggestion:</div>
          <div style="font-size: 13px; font-weight: 600; color: var(--text-main);">
            ${isEmergent ? "ICD-10 I20.9 — Angina pectoris / Acute Coronary Syndrome" : "ICD-10 R51.9 — Headache, unspecified / Digital Asthenopia"}
          </div>
        </div>
      `;

    } else if (tab === "telemetry") {
      container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 12px;">
          <div style="background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 10px; padding: 14px;">
            <div style="font-size: 13px; font-weight: 700; color: #38bdf8; margin-bottom: 6px;">⚡ Jev Clinical Engine Architecture Breakdown</div>
            <div style="font-size: 12px; color: var(--text-muted); line-height: 1.6;">
              <strong>• System 1 (Deterministic Fast Path):</strong> Regex & WebAssembly automata executing locally inside the client browser. Latency: <strong>0.28ms</strong>. Token Cost: <strong>$0.00</strong>. Resilient against network drops and LLM outages.<br>
              <strong>• System 2 (Multi-Agent Reasoning Path):</strong> Triggered only after System 1 clears all critical red flags. Deploys Intake, Diagnostic, and Arbiter agents for nuanced clinical differentials.
            </div>
          </div>
          <div style="background: var(--card-bg); border: 1px solid var(--card-border); border-radius: 10px; padding: 14px;">
            <div style="font-size: 13px; font-weight: 700; color: #10b981; margin-bottom: 6px;">🛡️ Dual-Vault Zero-Trace Boundaries</div>
            <div style="font-size: 12px; color: var(--text-muted); line-height: 1.6;">
              <strong>Vault 1 (Patient Identity):</strong> Transient ephemeral UUID hash. Never written to disk or third-party vector databases.<br>
              <strong>Vault 2 (Clinical Payload):</strong> AES-256-GCM encrypted symptom transcript. Completely unlinked from IP, device fingerprints, or payment profiles.
            </div>
          </div>
        </div>
      `;
    }
  }

  copyCurrentContent() {
    const container = this.dom.dashContentBody;
    if (!container) return;
    const text = container.innerText || container.textContent;
    navigator.clipboard.writeText(text).then(() => {
      if (this.dom.btnCopyContent) {
        const original = this.dom.btnCopyContent.textContent;
        this.dom.btnCopyContent.textContent = "✓ Copied!";
        setTimeout(() => {
          this.dom.btnCopyContent.textContent = original;
        }, 1800);
      }
    });
  }
}

// ─── Initialize on DOM Load ──────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  window.simulationApp = new SimulationEngine();
});
