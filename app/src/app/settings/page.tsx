"use client";
import { useState } from "react";
import { clsx } from "clsx";
import { Check, Download, Monitor, Moon, Pencil, Sun, Trash2, ChevronRight, HardDrive, SlidersHorizontal } from "lucide-react";
import { SkillTag } from "@/components/SkillBits";
import { Shell } from "@/components/Shell";
import { Button, Chip, Page, SectionTitle, Sheet, Switch, useToast } from "@/components/ui";
import { isReady, STORAGE_KEY, useByok } from "@/lib/byok";
import { stopSpeaking, unlockSpeech } from "@/lib/speech";
import { DEFAULT_PATIENCE, useApp, useLang } from "@/store/useApp";
import { t, pick } from "@/lib/i18n";
import { clockMarks, PatiencePicker } from "@/components/practice/ReplyClock";
import { COMPETENCIES, SKILLS, type Lang, type SkillId } from "@/data/taxonomy";
import { compColor } from "@/lib/format";
import { AvatarFigure, learnerSeed } from "@/data/avatars";
import { AvatarPicker } from "@/components/AvatarPicker";

export default function Settings() {
  const lang = useLang();
  const {
    profile,
    proficiency,
    sessions,
    settings,
    setSettings,
    setLang,
    updateProfile,
    setProficiency,
    reset,
    customScenarios,
    bookmarks,
    practiceDays,
  } = useApp();
  const toast = useToast((s) => s.show);
  const [edit, setEdit] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const byok = useByok();
  const ownModel = isReady(byok);
  const [name, setName] = useState(profile?.name ?? "");
  const [bio, setBio] = useState(profile?.bio ?? "");
  if (!profile) return null;

  const exportData = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { profile, proficiency, sessions, customScenarios, bookmarks, practiceDays, avatar: { seed: settings.avatarSeed, portrait: settings.avatarPortrait }, exportedAt: new Date().toISOString() },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `socialcoach-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const toggleGoal = (id: SkillId) => {
    const has = profile.goals.includes(id);
    if (has && profile.goals.length <= 1) return;
    updateProfile({ goals: has ? profile.goals.filter((g) => g !== id) : [...profile.goals, id] });
    if (!has && proficiency[id] == null) setProficiency({ ...proficiency, [id]: 2.5 });
  };

  return (
    <Shell>
      <Page className="pt-4 flex flex-col gap-8 lg:pt-9 lg:grid lg:grid-cols-2 lg:gap-x-0 lg:gap-y-12">
        <header className="lg:col-span-2 border-b border-line pb-6">
          <p className="eyebrow text-accent-deep mb-3">{t(lang, "st_title")}</p>
          <h1 className="display text-[30px] lg:text-[38px] leading-tight">{t(lang, "st_heading")}</h1>
          <p className="text-[14px] text-ink-3 mt-3 leading-relaxed">{t(lang, "st_intro")}</p>
        </header>

        <div className="contents lg:flex lg:flex-col lg:gap-12 lg:pr-10">
          <section className="flex flex-col gap-3">
            <SectionTitle
              right={
                <button
                  onClick={() => {
                    setName(profile.name);
                    setBio(profile.bio);
                    setEdit(true);
                  }}
                  className="press text-[13px] text-action min-h-11"
                >
                  {t(lang, "st_edit")}
                </button>
              }
            >
              {t(lang, "st_profile")}
            </SectionTitle>
            <div className="profile-paper rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setAvatarOpen(true)}
                  aria-label={pick({ zh: "编辑头像", en: "Edit portrait" }, lang)}
                  className="press relative rounded-full shrink-0"
                >
                  <AvatarFigure seed={learnerSeed(profile.name, settings.avatarSeed, settings.avatarPortrait)} hue={40} size={72} />
                  <span className="absolute -bottom-1 -right-1 rounded-full bg-card border border-line p-1.5 text-ink-2"><Pencil size={12} aria-hidden /></span>
                </button>
                <div className="min-w-0">
                  <p className="display text-[22px] break-words">{profile.name || pick({ zh: "未命名", en: "Unnamed" }, lang)}</p>
                  <button type="button" onClick={() => setAvatarOpen(true)} className="press inline-flex items-center gap-1 min-h-11 text-[13px] text-action">
                    {pick({ zh: "挑选头像", en: "Choose a portrait" }, lang)}<ChevronRight size={14} aria-hidden />
                  </button>
                </div>
              </div>
              <p className="text-[14px] text-ink-2 leading-relaxed lg:max-w-[var(--measure)]">{profile.bio || t(lang, "st_bio_empty")}</p>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle
              right={
                <button onClick={() => setGoalsOpen(true)} className="press text-[13px] text-action min-h-11">
                  {t(lang, "st_edit")}
                </button>
              }
            >
              {t(lang, "st_goals")}
            </SectionTitle>
            <div className="flex flex-wrap gap-2">
              {profile.goals.map((g) => (
                <SkillTag key={g} id={g} lang={lang} />
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle>{t(lang, "st_prefs")}</SectionTitle>
            <div className="card divide-y divide-line">
              <Row label={t(lang, "st_language")}>
                <div className="inline-flex rounded-full border border-line p-0.5 text-[12px] font-medium">
                  {(["zh", "en"] as Lang[]).map((l) => (
                    <button
                      key={l}
                      aria-pressed={lang === l}
                      onClick={() => setLang(l)}
                      className={clsx(
                        "press px-3 min-h-11 rounded-full inline-flex items-center gap-1.5",
                        lang === l ? "bg-ink text-paper" : "text-ink-3",
                      )}
                    >
                      {l === "zh" ? "中文" : "English"}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label={t(lang, "st_theme")}>
                <div className="inline-flex rounded-full border border-line p-0.5 text-[12px] font-medium">
                  {(["system", "light", "dark"] as const).map((v) => (
                    <button
                      key={v}
                      aria-pressed={(settings.theme ?? "system") === v}
                      onClick={() => setSettings({ theme: v })}
                      className={clsx(
                        "press px-3 min-h-11 rounded-full inline-flex items-center gap-1.5",
                        (settings.theme ?? "system") === v ? "bg-ink text-paper" : "text-ink-3",
                      )}
                    >
                      {v === "system" ? (
                        <Monitor size={14} aria-hidden />
                      ) : v === "light" ? (
                        <Sun size={14} aria-hidden />
                      ) : (
                        <Moon size={14} aria-hidden />
                      )}
                      {t(lang, v === "system" ? "st_theme_system" : v === "light" ? "st_theme_light" : "st_theme_dark")}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label={t(lang, "st_voice")} hint={t(lang, "st_voice_hint")}>
                <Switch
                  checked={settings.tts}
                  // Turning it on is a user gesture — the only thing iOS accepts to
                  // unlock speech. Spend it here so the first line actually plays.
                  onChange={(v) => {
                    if (v) unlockSpeech();
                    else stopSpeaking();
                    setSettings({ tts: v });
                  }}
                  label={t(lang, "st_voice")}
                />
              </Row>
              <Row label={t(lang, "pr_clock_title")} hint={t(lang, "pr_clock_explain", clockMarks(settings.patience ?? DEFAULT_PATIENCE))}>
                <Switch checked={!!settings.timed} onChange={(v) => setSettings({ timed: v })} label={t(lang, "pr_clock_title")} />
              </Row>
              <Row label={t(lang, "pr_clock_patience")}>
                <PatiencePicker value={settings.patience ?? DEFAULT_PATIENCE} onChange={(p) => setSettings({ patience: p })} lang={lang} />
              </Row>
            </div>
          </section>
        </div>

        <div className="contents lg:flex lg:flex-col lg:gap-12 lg:border-l lg:border-line lg:pl-10">
          <section className="flex flex-col gap-3">
            <SectionTitle>{t(lang, "st_model")}</SectionTitle>
            <button onClick={byok.openSheet} className="press card card-link w-full text-left p-4 flex items-center gap-3">
              <SlidersHorizontal size={20} className="shrink-0 text-teal" aria-hidden />
              <span className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-[14px] font-medium">
                  {ownModel ? `${t(lang, "st_model_own")} · ${byok.fastModel}` : t(lang, "st_model_default")}
                </span>
                <span className="text-[12px] text-ink-3 leading-snug">
                  {ownModel ? t(lang, "st_model_local") : t(lang, "st_model_row_hint")}
                </span>
              </span>
              <ChevronRight size={16} className="text-ink-4 shrink-0" />
            </button>
          </section>

          <section className="flex flex-col gap-3">
            <SectionTitle>{t(lang, "st_data")}</SectionTitle>
            <p className="text-[12px] text-ink-3 flex items-center gap-2">
              <HardDrive size={14} className="shrink-0" aria-hidden />
              {t(lang, "st_local_note")}
            </p>
            <div className="card divide-y divide-line">
              <Row label={t(lang, "st_telemetry")} hint={t(lang, "st_telemetry_hint")}>
                <Switch checked={settings.telemetry !== false} onChange={(v) => setSettings({ telemetry: v })} label={t(lang, "st_telemetry")} />
              </Row>
              <button
                onClick={exportData}
                className="press w-full flex items-center gap-3 px-4 min-h-16 py-3.5 text-left text-[14px] font-medium"
              >
                <Download size={17} className="text-ink-3" />
                <span className="flex-1">
                  {t(lang, "st_export")}
                  <span className="block font-normal text-[12px] text-ink-3 mt-1">{t(lang, "st_export_hint")}</span>
                </span>
                <ChevronRight size={16} className="ml-auto text-ink-4" />
              </button>
              <button
                onClick={() => setConfirm(true)}
                className="press w-full flex items-center gap-3 px-4 py-3.5 text-left text-[14px] font-medium text-danger"
              >
                <Trash2 size={17} />
                {t(lang, "st_reset")}
              </button>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <SectionTitle>{t(lang, "st_about")}</SectionTitle>
            <p className="text-[13px] text-ink-3 leading-relaxed lg:max-w-[var(--measure)]">{t(lang, "st_about_body")}</p>
            <a
              className="text-[13px] text-teal underline underline-offset-2"
              href="https://arxiv.org/abs/2606.04155"
              target="_blank"
              rel="noreferrer"
            >
              arXiv:2606.04155
            </a>
          </section>
        </div>
      </Page>

      {avatarOpen && <AvatarPicker
        currentSeed={learnerSeed(profile.name, settings.avatarSeed, settings.avatarPortrait)}
        lang={lang}
        onClose={() => setAvatarOpen(false)}
        onSave={(avatarPortrait) => {
          setSettings({ avatarPortrait });
          setAvatarOpen(false);
          toast(pick({ zh: "头像已更新", en: "Portrait updated" }, lang));
        }}
      />}

      <Sheet open={edit} onClose={() => setEdit(false)} title={t(lang, "st_profile")}>
        <div className="flex flex-col gap-4 pt-2">
          <label htmlFor="profile-name" className="text-[13px] font-semibold">
            {t(lang, "ob_name")}
          </label>
          <input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t(lang, "ob_name_ph")}
            className="h-12 px-4 rounded-xl bg-card border border-line text-[15px]"
            maxLength={24}
          />
          <label htmlFor="profile-bio" className="text-[13px] font-semibold">
            {t(lang, "st_bio_label")}
          </label>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t(lang, "ob_bio_ph")}
            rows={5}
            className="px-4 py-3 rounded-xl bg-card border border-line text-[15px] leading-relaxed"
            maxLength={300}
          />
          <Button
            block
            onClick={() => {
              updateProfile({ name: name.trim(), bio: bio.trim() });
              setEdit(false);
              toast(t(lang, "done"));
            }}
          >
            {t(lang, "save")}
          </Button>
        </div>
      </Sheet>

      <Sheet open={goalsOpen} onClose={() => setGoalsOpen(false)} title={t(lang, "st_goals")}>
        <div className="flex flex-col gap-4 pt-2">
          <p className="text-[13px] text-ink-3" role="status">
            {t(lang, "st_goal_hint", { n: profile.goals.length })}
          </p>
          {COMPETENCIES.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <span className="eyebrow" style={{ color: compColor(c.id, 0.45, 0.09) }}>
                {c.name[lang]}
              </span>
              <div className="flex flex-wrap gap-2">
                {SKILLS.filter((s) => s.competency === c.id).map((s) => (
                  <Chip key={s.id} active={profile.goals.includes(s.id)} onClick={() => toggleGoal(s.id)}>
                    {profile.goals.includes(s.id) && <Check size={12} aria-hidden />}
                    {s.name[lang]}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Sheet>

      <Sheet open={confirm} onClose={() => setConfirm(false)} title={t(lang, "st_reset")}>
        <div className="flex flex-col gap-4 pt-2">
          <p className="text-[14px] text-ink-2 leading-relaxed">{t(lang, "st_reset_confirm")}</p>
          <Button
            block
            variant="danger"
            onClick={() => {
              byok.clear();
              try {
                localStorage.removeItem(STORAGE_KEY);
              } catch {}
              reset();
              setConfirm(false);
            }}
          >
            {t(lang, "st_reset")}
          </Button>
          <Button block variant="ghost" onClick={() => setConfirm(false)}>
            {t(lang, "cancel")}
          </Button>
        </div>
      </Sheet>
    </Shell>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
      <span className="text-[14px] font-medium flex-1 min-w-[90px]">
        {label}
        {hint && <span className="block text-[12px] font-normal text-ink-3 leading-relaxed mt-1">{hint}</span>}
      </span>
      {children}
    </div>
  );
}
