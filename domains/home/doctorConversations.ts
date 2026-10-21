import { chatRepository, applyLivePresence, presenceSortWeight, buildConversationFromPeer } from "@/domains/chat";
import type { Conversation } from "@/domains/chat";
import type { SpecialityDoctor } from "@/domains/home/api";

export function doctorsToConversations(
  doctors: SpecialityDoctor[],
): Conversation[] {
  const users = doctors.map((d) =>
    applyLivePresence({
      id: d.id,
      name: d.name,
      photoUrl: d.photoUrl,
      presence: "offline" as const,
      role: "doctor" as const,
      specialty: (d.specialty ?? d.professionalTitle)?.trim() || undefined,
      country: d.country?.trim().toUpperCase() || "EG",
      rating: d.ratingAverage ?? undefined,
      ratingTotal: d.ratingTotal ?? undefined,
      consultationPrice: d.consultationPrice ?? 1,
      textPriceLocal: d.textPriceLocal ?? null,
      textPriceUsd: d.textPriceUsd ?? null,
      videoPriceLocal: d.videoPriceLocal ?? null,
      videoPriceUsd: d.videoPriceUsd ?? null,
      immediateCallEnabled: !!d.immediateCallEnabled,
      onCall: !!d.onCall,
      doctorEntityId: d.doctorId,
      tags: d.tags?.length ? d.tags : undefined,
    }),
  );

  chatRepository.cacheUsers(users);

  return users
    .map((user) => buildConversationFromPeer(user))
    .sort(
      (a, b) =>
        presenceSortWeight(a.user.presence) - presenceSortWeight(b.user.presence) ||
        a.user.name.localeCompare(b.user.name),
    );
}
