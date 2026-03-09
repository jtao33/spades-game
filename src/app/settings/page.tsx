"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  PageLayout,
  Section,
  ToggleButtonGroup,
  ToggleSwitch,
  Button,
} from "@/components/ui";
import { FONTS } from "@/lib/styles";
import { logger } from "@/lib/logger";

interface Settings {
  difficulty: "easy" | "medium" | "hard";
  animationSpeed: "slow" | "normal" | "fast";
  showTutorial: boolean;
  cardSortOrder: "ascending" | "descending";
  spadesPosition: "left" | "right";
}

const DEFAULT_SETTINGS: Settings = {
  difficulty: "medium",
  animationSpeed: "normal",
  showTutorial: true,
  cardSortOrder: "ascending",
  spadesPosition: "left",
};

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"] as const;
const SPEED_OPTIONS = ["slow", "normal", "fast"] as const;
const SORT_ORDER_OPTIONS = ["ascending", "descending"] as const;
const SPADES_POSITION_OPTIONS = ["left", "right"] as const;

const GAME_RULES = [
  { label: "Win condition", value: "500 points", highlight: true },
  { label: "Nil bonus/penalty", value: "+50 / -50", highlight: false },
  { label: "Blind Nil bonus/penalty", value: "+100 / -100", highlight: false },
  { label: "Bag penalty", value: "-50 per 5 bags", highlight: false },
] as const;

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          setSettings(await res.json());
        } else {
          setError("Failed to load settings. Using defaults.");
        }
      } catch (err) {
        logger.error("Settings fetch error", { error: String(err) });
        setError("Network error. Using defaults.");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000); // Using inline value for UI feedback timing
    } catch (err) {
      logger.error("Settings save error", { error: String(err) });
      setError("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  return (
    <PageLayout
      title="SETTINGS"
      breadcrumbs={[{ label: "Settings" }]}
      loading={loading}
      error={error}
    >
      <div className="space-y-6">
        {/* Difficulty Selection */}
        <Section title="Default Difficulty" description="The AI difficulty level for new games">
          <ToggleButtonGroup
            options={DIFFICULTY_OPTIONS}
            value={settings.difficulty}
            onChange={(v) => handleChange("difficulty", v)}
          />
        </Section>

        {/* Animation Speed */}
        <Section title="Animation Speed" description="Controls card dealing and play animation speed">
          <ToggleButtonGroup
            options={SPEED_OPTIONS}
            value={settings.animationSpeed}
            onChange={(v) => handleChange("animationSpeed", v)}
          />
        </Section>

        {/* Tutorial Toggle */}
        <Section title="Tutorial">
          <ToggleSwitch
            checked={settings.showTutorial}
            onChange={(v) => handleChange("showTutorial", v)}
            label="Show tutorial for new players"
          />
        </Section>

        {/* Card Sorting */}
        <Section title="Card Sort Order" description="How cards are sorted in your hand by rank">
          <ToggleButtonGroup
            options={SORT_ORDER_OPTIONS}
            value={settings.cardSortOrder}
            onChange={(v) => handleChange("cardSortOrder", v)}
          />
        </Section>

        {/* Spades Position */}
        <Section title="Spades Position" description="Where spades appear in your hand">
          <ToggleButtonGroup
            options={SPADES_POSITION_OPTIONS}
            value={settings.spadesPosition}
            onChange={(v) => handleChange("spadesPosition", v)}
          />
        </Section>

        {/* Game Rules Info */}
        <Section title="Game Rules">
          <div className="space-y-2 text-sm text-white">
            {GAME_RULES.map(({ label, value, highlight }) => (
              <div key={label} className="flex justify-between">
                <span>{label}</span>
                <span
                  className="font-mono"
                  style={{
                    fontFamily: FONTS.mono,
                    color: highlight ? "#ffd700" : undefined,
                  }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </Section>

        {/* Save Button */}
        <motion.div
          className="pt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleSave}
            isLoading={saving}
          >
            {saved ? "Saved!" : "Save Settings"}
          </Button>
        </motion.div>
      </div>
    </PageLayout>
  );
}
