import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  validateRequest,
  successResponse,
  errorResponse,
  withErrorHandler,
} from "@/lib/api/utils";
import { isValidDifficulty, isValidAnimationSpeed } from "@/lib/validation";

const DEFAULT_SETTINGS = {
  id: "global",
  difficulty: "medium",
  animationSpeed: "normal",
  showTutorial: true,
  cardSortOrder: "ascending",
  spadesPosition: "left",
} as const;

interface SettingsBody {
  difficulty?: string;
  animationSpeed?: string;
  showTutorial?: boolean;
  cardSortOrder?: string;
  spadesPosition?: string;
}

const VALID_SORT_ORDERS = ["ascending", "descending"];
const VALID_SPADES_POSITIONS = ["left", "right"];

function validateSettingsBody(body: SettingsBody): string | null {
  const { difficulty, animationSpeed, showTutorial, cardSortOrder, spadesPosition } = body;

  if (difficulty !== undefined && !isValidDifficulty(difficulty)) {
    return "Invalid difficulty value";
  }
  if (animationSpeed !== undefined && !isValidAnimationSpeed(animationSpeed)) {
    return "Invalid animation speed value";
  }
  if (showTutorial !== undefined && typeof showTutorial !== "boolean") {
    return "Invalid showTutorial value";
  }
  if (cardSortOrder !== undefined && !VALID_SORT_ORDERS.includes(cardSortOrder)) {
    return "Invalid cardSortOrder value";
  }
  if (spadesPosition !== undefined && !VALID_SPADES_POSITIONS.includes(spadesPosition)) {
    return "Invalid spadesPosition value";
  }

  return null;
}

export async function GET(request: NextRequest) {
  const { error } = await validateRequest({ request });
  if (error) return error;

  return withErrorHandler(
    async () => {
      let settings = await prisma.settings.findUnique({
        where: { id: "global" },
      });

      if (!settings) {
        settings = await prisma.settings.create({ data: DEFAULT_SETTINGS });
      }

      return successResponse(settings, request);
    },
    "Failed to fetch settings"
  );
}

export async function POST(request: NextRequest) {
  const { body, error } = await validateRequest<SettingsBody>({
    request,
    requireBody: true,
  });
  if (error) return error;

  const validationError = validateSettingsBody(body ?? {});
  if (validationError) {
    return errorResponse(validationError, 400);
  }

  const { difficulty, animationSpeed, showTutorial, cardSortOrder, spadesPosition } = body ?? {};

  return withErrorHandler(
    async () => {
      const settings = await prisma.settings.upsert({
        where: { id: "global" },
        update: {
          ...(difficulty && { difficulty }),
          ...(animationSpeed && { animationSpeed }),
          ...(showTutorial !== undefined && { showTutorial }),
          ...(cardSortOrder && { cardSortOrder }),
          ...(spadesPosition && { spadesPosition }),
        },
        create: {
          id: "global",
          difficulty: difficulty || "medium",
          animationSpeed: animationSpeed || "normal",
          showTutorial: showTutorial ?? true,
          cardSortOrder: cardSortOrder || "ascending",
          spadesPosition: spadesPosition || "left",
        },
      });

      return successResponse(settings, request);
    },
    "Failed to update settings"
  );
}
