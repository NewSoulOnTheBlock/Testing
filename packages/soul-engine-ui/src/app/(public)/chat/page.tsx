"use client";

import PublicChat from "@/components/PublicChat";
import { Box, Flex, Text } from "@radix-ui/themes";
import { useSearchParams } from "next/navigation";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useMemo } from "react";

type ChatParams = {
  organizationSlug: string;
  subroutineId: string;
  chatId?: string;
};

const defaultOrganizationSlug =
  process.env.NEXT_PUBLIC_SOUL_ENGINE_ORGANIZATION ?? "";
const defaultSubroutineId =
  process.env.NEXT_PUBLIC_SOUL_ENGINE_BLUEPRINT ?? "";
const defaultChatId = process.env.NEXT_PUBLIC_SOUL_ENGINE_CHAT_ID ?? "";

const getParam = (
  searchParams: ReadonlyURLSearchParams,
  key: string,
  fallback: string
): string => {
  const value = searchParams.get(key);
  return value && value.length > 0 ? value : fallback;
};

const resolveChatParams = (
  searchParams: ReadonlyURLSearchParams
): ChatParams => {
  return {
    organizationSlug: getParam(
      searchParams,
      "organization",
      defaultOrganizationSlug
    ),
    subroutineId: getParam(searchParams, "subroutine", defaultSubroutineId),
    chatId: getParam(searchParams, "chatId", defaultChatId) || undefined,
  };
};

export default function PublicChatPage() {
  const searchParams = useSearchParams();
  const { organizationSlug, subroutineId, chatId } = useMemo(
    () => resolveChatParams(searchParams),
    [searchParams]
  );

  if (!organizationSlug || !subroutineId) {
    return (
      <Flex align="center" justify="center" className="h-screen w-screen">
        <Box className="max-w-lg px-6 text-center">
          <Text size="4" weight="medium">
            Missing chat identifiers.
          </Text>
          <Text as="p" color="gray" className="mt-2">
            Set NEXT_PUBLIC_SOUL_ENGINE_ORGANIZATION and
            NEXT_PUBLIC_SOUL_ENGINE_BLUEPRINT, or pass ?organization= and
            ?subroutine= in the URL.
          </Text>
        </Box>
      </Flex>
    );
  }

  return (
    <PublicChat
      organizationSlug={organizationSlug}
      subroutineId={subroutineId}
      chatId={chatId}
    />
  );
}
