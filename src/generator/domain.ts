import type { PrismaSchema, ScenarioDefinition, ScenarioDomain } from "../prisma/types.js";
import { normalizeName, titleCase } from "../util/case.js";

const DOMAIN_KEYWORDS: Record<Exclude<ScenarioDomain, "auto">, string[]> = {
  saas: [
    "account",
    "apikey",
    "billing",
    "customer",
    "invoice",
    "member",
    "organization",
    "plan",
    "seat",
    "subscription",
    "team",
    "tenant",
    "usage",
    "workspace"
  ],
  commerce: [
    "cart",
    "checkout",
    "customer",
    "inventory",
    "lineitem",
    "order",
    "payment",
    "product",
    "refund",
    "shipment",
    "sku"
  ],
  content: [
    "article",
    "author",
    "category",
    "comment",
    "media",
    "page",
    "post",
    "profile",
    "tag"
  ],
  generic: []
};

export function inferDomain(schema: PrismaSchema, requested: ScenarioDomain = "auto"): Exclude<ScenarioDomain, "auto"> {
  if (requested !== "auto") {
    return requested;
  }

  const names = schema.models.flatMap((model) => [
    normalizeName(model.name),
    ...model.fields.map((field) => normalizeName(field.name))
  ]);

  const scores = Object.entries(DOMAIN_KEYWORDS).map(([domain, keywords]) => ({
    domain: domain as Exclude<ScenarioDomain, "auto">,
    score: keywords.reduce((sum, keyword) => sum + names.filter((name) => name.includes(keyword)).length, 0)
  }));

  const winner = scores.sort((left, right) => right.score - left.score)[0];
  return winner && winner.score > 0 ? winner.domain : "generic";
}

export function scenarioDefinitions(
  domain: Exclude<ScenarioDomain, "auto">,
  requestedScenario?: string,
  maxScenarios = 4
): ScenarioDefinition[] {
  const scenarios: Record<Exclude<ScenarioDomain, "auto">, ScenarioDefinition[]> = {
    saas: [
      {
        key: "trial_expiring",
        title: "Trial Expiring",
        story: "A self-serve customer is close to the end of trial and has not converted yet."
      },
      {
        key: "past_due_enterprise",
        title: "Past-Due Enterprise",
        story: "A high-value account has a failed invoice and should be blocked from expansion."
      },
      {
        key: "usage_over_quota",
        title: "Usage Over Quota",
        story: "An active workspace exceeded its plan limit and should see upgrade pressure."
      },
      {
        key: "canceled_winback",
        title: "Canceled Winback",
        story: "A canceled account still has historical value and is eligible for a winback flow."
      }
    ],
    commerce: [
      {
        key: "abandoned_cart",
        title: "Abandoned Cart",
        story: "A known customer added products to cart but did not complete checkout."
      },
      {
        key: "payment_failed",
        title: "Payment Failed",
        story: "An order failed during payment and should keep inventory reserved briefly."
      },
      {
        key: "refunded_order",
        title: "Refunded Order",
        story: "A paid order has been refunded and needs support, inventory, and finance views to agree."
      },
      {
        key: "delayed_shipment",
        title: "Delayed Shipment",
        story: "A shipment is late enough to trigger customer-facing delivery messaging."
      }
    ],
    content: [
      {
        key: "draft_review",
        title: "Draft In Review",
        story: "A contributor submitted a draft and is waiting on an editor."
      },
      {
        key: "scheduled_publish",
        title: "Scheduled Publish",
        story: "An approved post is queued for a future publishing window."
      },
      {
        key: "spam_comment",
        title: "Spam Comment",
        story: "A published article received a suspicious comment requiring moderation."
      },
      {
        key: "archived_content",
        title: "Archived Content",
        story: "Old content has been removed from active navigation while keeping audit history."
      }
    ],
    generic: [
      {
        key: "happy_path",
        title: "Happy Path",
        story: "A complete, valid entity set that should pass the main product workflow."
      },
      {
        key: "blocked_state",
        title: "Blocked State",
        story: "A required dependency or approval is missing and should prevent progression."
      },
      {
        key: "edge_case",
        title: "Edge Case",
        story: "A valid but uncommon state that should reveal brittle assumptions."
      },
      {
        key: "recovery_state",
        title: "Recovery State",
        story: "An entity is moving from a failed state back into a usable state."
      }
    ]
  };

  const selected = scenarios[domain].slice(0, Math.max(1, maxScenarios));
  if (!requestedScenario) {
    return selected;
  }

  return selected.map((scenario, index) =>
    index === 0
      ? {
          ...scenario,
          story: `${scenario.story} Requested focus: ${requestedScenario}.`
        }
      : scenario
  );
}

export function packName(domain: Exclude<ScenarioDomain, "auto">, requestedScenario?: string): string {
  return requestedScenario ? titleCase(requestedScenario) : `${titleCase(domain)} Scenario Pack`;
}
