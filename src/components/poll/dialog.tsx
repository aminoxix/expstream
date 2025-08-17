// src/components/CustomPollCreationDialog.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import {
  Controller,
  Resolver,
  SubmitHandler,
  useFieldArray,
  useForm,
} from "react-hook-form";
import { toast } from "sonner";
import { VotingVisibility } from "stream-chat";
import { useChatContext } from "stream-chat-react";
import { z } from "zod";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";

const PollFormSchema = z.object({
  name: z.string().min(1, "Poll question is required"),
  description: z.string().optional(),
  options: z
    .array(z.object({ text: z.string().min(1, "Option cannot be empty") }))
    .min(2, "At least two options are required"),
  allow_answers: z.boolean().optional().default(true),
  allow_user_suggested_options: z.boolean().optional().default(false),
  enforce_unique_vote: z.boolean().optional().default(false),
  voting_visibility: z
    .enum(VotingVisibility)
    .optional()
    .default(VotingVisibility.public),
});

type PollFormValues = z.infer<typeof PollFormSchema>;

interface CustomPollCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pollId?: string;
  initialData?: PollFormValues;
}

export const CustomPollCreationDialog = ({
  isOpen,
  onClose,
  pollId,
  initialData,
}: CustomPollCreationDialogProps) => {
  const { client, channel } = useChatContext();

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PollFormValues>({
    resolver: zodResolver(PollFormSchema) as unknown as Resolver<
      PollFormValues,
      any
    >,
    defaultValues: initialData || {
      name: "",
      description: "",
      options: [{ text: "" }, { text: "" }],
      allow_answers: true,
      allow_user_suggested_options: false,
      enforce_unique_vote: false,
      voting_visibility: VotingVisibility.public,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "options",
  });

  const onSubmit: SubmitHandler<PollFormValues> = async (data) => {
    try {
      const pollData = {
        name: data.name,
        description: data.description || "",
        options: data.options,
        allow_answers: data.allow_answers,
        allow_user_suggested_options: data.allow_user_suggested_options,
        enforce_unique_vote: data.enforce_unique_vote,
        voting_visibility: data.voting_visibility,
      };

      console.log("[CustomPollCreationDialog] Submitting poll:", pollData, {
        pollId,
      });

      if (pollId) {
        console.warn("[CustomPollCreationDialog] Poll update not implemented");
        toast.error("Poll updating is not supported yet");
      } else {
        const poll = await client.polls.createPoll(pollData);
        await channel?.sendMessage({
          text: `New poll: ${data.name}`,
          poll_id: poll?.id,
        });
        toast.success("Poll created successfully");
      }

      reset();
      onClose();
    } catch (error) {
      console.error("[CustomPollCreationDialog] Error:", error);
      toast.error(pollId ? "Failed to update poll" : "Failed to create poll");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{pollId ? "Edit Poll" : "Create Poll"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          onKeyDown={(e) => {
            // Prevent Enter from submitting parent form
            if (e.key === "Enter" && !e.shiftKey) {
              e.stopPropagation();
            }
          }}
        >
          <div>
            <Label htmlFor="name">Poll Question</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Enter poll question"
              className="mt-1"
            />
            {errors.name && (
              <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Enter poll description"
              className="mt-1"
            />
            {errors.description && (
              <p className="text-sm text-red-500 mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          <div>
            <Label>Options</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2 mt-2">
                <Input
                  {...register(`options.${index}.text` as const)}
                  placeholder={`Option ${index + 1}`}
                />
                {fields.length > 2 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(index)}
                    aria-label={`Remove option ${index + 1}`}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {errors.options && (
              <p className="text-sm text-red-500 mt-1">
                {((errors.options as any)?.message as string) ||
                  (errors.options as any)?.root?.message ||
                  "Invalid options"}
              </p>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ text: "" })}
              className="mt-2"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="allow_answers">Allow Comments</Label>
              <Controller
                control={control}
                name="allow_answers"
                render={({ field }) => (
                  <Switch
                    id="allow_answers"
                    checked={!!field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                  />
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="allow_user_suggested_options">
                Allow User-Suggested Options
              </Label>
              <Controller
                control={control}
                name="allow_user_suggested_options"
                render={({ field }) => (
                  <Switch
                    id="allow_user_suggested_options"
                    checked={!!field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                  />
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="enforce_unique_vote">Enforce Unique Vote</Label>
              <Controller
                control={control}
                name="enforce_unique_vote"
                render={({ field }) => (
                  <Switch
                    id="enforce_unique_vote"
                    checked={!!field.value}
                    onCheckedChange={(checked) => field.onChange(checked)}
                  />
                )}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="voting_visibility">Anonymous Voting</Label>
              <Controller
                control={control}
                name="voting_visibility"
                render={({ field }) => (
                  <Switch
                    id="voting_visibility"
                    checked={field.value === VotingVisibility.anonymous}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked
                          ? VotingVisibility.anonymous
                          : VotingVisibility.public
                      )
                    }
                  />
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? pollId
                  ? "Updating..."
                  : "Creating..."
                : pollId
                ? "Update Poll"
                : "Create Poll"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
