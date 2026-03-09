"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { tryChatAction } from "@/utils/try-chat-action";
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  DotsSixVerticalIcon,
  PlusIcon,
  TrashIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import { useEffect } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  UseFormRegister,
  useWatch,
} from "react-hook-form";
import { toast } from "sonner";
import { Channel, StreamChat, VotingVisibility } from "stream-chat";
import { useChatContext } from "stream-chat-react";

type PollOption = {
  text: string;
};

interface SortableOptionProps {
  id: string;
  index: number;
  register: UseFormRegister<PollFormValues>;
  placeholder: string;
  canRemove: boolean;
  onRemove: () => void;
  disabled?: boolean;
}

const SortableOption = ({
  id,
  index,
  register,
  placeholder,
  canRemove,
  onRemove,
  disabled = false,
}: SortableOptionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-white border border-gray-200 rounded-md p-2"
    >
      <button
        type="button"
        className="text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <DotsSixVerticalIcon className="h-5 w-5" />
      </button>

      <Input
        {...register(`options.${index}.text` as const)}
        placeholder={placeholder}
        className="flex-1"
        disabled={disabled}
      />

      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          aria-label={`Remove option ${index + 1}`}
          className="text-gray-400 hover:text-red-500"
        >
          <TrashIcon className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

type PollFormValues = {
  name: string;
  description: string;
  options: PollOption[];
  allow_answers: boolean;
  allow_user_suggested_options: boolean;
  enforce_unique_vote: boolean;
  voting_visibility: "public" | "anonymous";
};

interface CustomPollCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pollId?: string;
  initialData?: PollFormValues;
  client?: StreamChat;
  channel?: Channel;
  onPollCreated?: () => void;
}

export const CustomPollCreationDialog = ({
  isOpen,
  onClose,
  pollId,
  initialData,
  client: propClient,
  channel: propChannel,
  onPollCreated,
}: CustomPollCreationDialogProps) => {
  const contextResult = useChatContext();
  const client = propClient || contextResult.client;
  const channel = propChannel || contextResult.channel;

  const form = useForm<PollFormValues>({
    defaultValues: initialData || {
      name: "",
      description: "",
      options: [{ text: "" }, { text: "" }],
      allow_answers: true,
      allow_user_suggested_options: false,
      enforce_unique_vote: false,
      voting_visibility: "public",
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "options",
  });

  const watchedOptions = useWatch({
    control: form.control,
    name: "options",
  });

  useEffect(() => {
    const validOptions =
      watchedOptions?.filter((option) => option?.text?.trim()) || [];
    if (validOptions.length >= 2) {
      const optionTexts = validOptions.map((option) =>
        option.text.trim().toLowerCase(),
      );
      const duplicates = optionTexts.filter(
        (text, index) => optionTexts.indexOf(text) !== index,
      );

      if (duplicates.length > 0) {
        form.setError("options", {
          type: "identical",
          message:
            "Identical options detected. Please modify duplicate options.",
        });
      } else {
        form.clearErrors("options");
      }
    } else {
      form.clearErrors("options");
    }
  }, [watchedOptions, form]);

  useEffect(() => {
    if (initialData) {
      form.reset(initialData);
    }
  }, [initialData, form]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = fields.findIndex((field) => field.id === active.id);
      const newIndex = fields.findIndex((field) => field.id === over?.id);

      move(oldIndex, newIndex);
    }
  };

  const onSubmit = form.handleSubmit(async (data: PollFormValues) => {
    if (!data.name?.trim()) {
      form.setError("name", {
        type: "required",
        message: "Poll question is required",
      });
      return;
    }

    const validOptions = data.options.filter((option) => option.text.trim());
    if (validOptions.length < 2) {
      form.setError("options", {
        type: "min",
        message: "At least two options are required",
      });
      return;
    }

    const optionTexts = validOptions.map((option) =>
      option.text.trim().toLowerCase(),
    );
    const duplicates = optionTexts.filter(
      (text, index) => optionTexts.indexOf(text) !== index,
    );
    if (duplicates.length > 0) {
      form.setError("options", {
        type: "identical",
        message: "Identical options detected. Please modify duplicate options.",
      });
      return;
    }

    if (!client) {
      toast.error("Chat client not available. Please try again.");
      return;
    }

    if (!channel) {
      toast.error("Channel not available. Please try again.");
      return;
    }

    const pollData = {
      name: data.name.trim(),
      description: data.description?.trim() || "",
      options: validOptions,
      allow_answers: data.allow_answers,
      allow_user_suggested_options: data.allow_user_suggested_options,
      enforce_unique_vote: data.enforce_unique_vote,
      voting_visibility:
        data.voting_visibility === "anonymous"
          ? VotingVisibility.anonymous
          : VotingVisibility.public,
    };

    const [ok] = await tryChatAction(
      async () => {
        if (pollId) {
          const pollInstance = client.polls.fromState(pollId);

          const { options, ...pollMetadata } = pollData;
          const updatedPoll = await pollInstance?.partialUpdate({
            set: pollMetadata,
          });

          if (!updatedPoll?.poll?.id) {
            throw new Error("Failed to update poll - no poll ID returned");
          }

          if (channel) {
            const messages = channel.state.messages;
            const pollMessage = messages.find((msg) => msg.poll_id === pollId);

            if (pollMessage) {
              const updatedText = [
                `New Poll: **${data.name || "Untitled"}**`,
                data.description ? `\n${data.description}` : "",
              ].join("\n");

              await client.updateMessage({
                id: pollMessage.id,
                text: updatedText,
              });
            }
          }

          toast.success(
            "Poll updated successfully (options cannot be modified once created)",
          );
        } else {
          const poll = await client.polls.createPoll(pollData);

          if (!poll?.id) {
            throw new Error("Failed to create poll - no poll ID returned");
          }

          const textParts = [
            `New Poll: **${data.name || "Untitled"}**`,
            data.description ? `\n${data.description}` : "",
          ].join("\n");

          await channel.sendMessage({
            text: textParts,
            poll_id: poll.id,
          });

          toast.success("Poll created successfully");
        }
      },
      {
        silent: true,
        onError: (info) => {
          toast.error(
            `Failed to ${pollId ? "update" : "create"} poll: ${info.message}`,
          );
        },
      },
    );

    if (!ok) return;

    onPollCreated?.();
    form.reset();
    onClose();
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{pollId ? "Edit Poll" : "Create Poll"}</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={onSubmit}
          className="flex-1 space-y-6 overflow-y-auto max-h-[70vh]"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.stopPropagation();
            }
          }}
        >
          <div className="px-1">
            <Label htmlFor="poll-name">Poll Question</Label>
            <Input
              id="poll-name"
              {...form.register("name")}
              placeholder="Enter poll question"
              className="mt-1"
            />
            {form.formState.errors.name && (
              <p className="text-sm text-red-500 mt-1">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="px-1">
            <Label htmlFor="poll-description">Description (Optional)</Label>
            <Textarea
              id="poll-description"
              {...form.register("description")}
              placeholder="Enter poll description"
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="space-y-2 px-1">
            <Label>Poll Options (up to 10)</Label>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={fields.map((field) => field.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {fields.map((field, index) => (
                    <SortableOption
                      key={field.id}
                      id={field.id}
                      index={index}
                      register={form.register}
                      placeholder={`Option ${index + 1}`}
                      canRemove={fields.length > 2 && !pollId}
                      onRemove={() => remove(index)}
                      disabled={!!pollId}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {!pollId && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button
                      size="sm"
                      type="button"
                      className="mt-2"
                      variant="outline"
                      disabled={fields.length >= 10}
                      onClick={(e) => {
                        e.preventDefault();
                        append({ text: "" });
                      }}
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  </span>
                </TooltipTrigger>

                {fields.length >= 10 && (
                  <TooltipContent>
                    <p>You've reached the maximum of 10 options</p>
                  </TooltipContent>
                )}
              </Tooltip>
            )}
            {form.formState.errors.options && (
              <p className="text-sm text-red-500">
                {form.formState.errors.options.message}
              </p>
            )}

            <p className="flex items-center text-sm text-yellow-600 mt-2">
              <WarningIcon className="size-4 mr-2" />
              Poll options cannot be modified once created.
            </p>
          </div>

          <div className="space-y-3 px-1">
            <Label>Poll Settings</Label>
            <div className="space-y-2">
              <Controller
                control={form.control}
                name="allow_answers"
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allow-answers"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <label
                      htmlFor="allow-answers"
                      className="text-sm font-medium"
                    >
                      Allow Comments
                    </label>
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="allow_user_suggested_options"
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="allow-suggestions"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <label
                      htmlFor="allow-suggestions"
                      className="text-sm font-medium"
                    >
                      Allow User-Suggested Options
                    </label>
                  </div>
                )}
              />

              <Controller
                control={form.control}
                name="enforce_unique_vote"
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="unique-vote"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                    <label
                      htmlFor="unique-vote"
                      className="text-sm font-medium"
                    >
                      Enforce Unique Vote
                    </label>
                  </div>
                )}
              />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="anonymous-voting"
                  checked={form.watch("voting_visibility") === "anonymous"}
                  onCheckedChange={(checked) =>
                    form.setValue(
                      "voting_visibility",
                      checked ? "anonymous" : "public",
                    )
                  }
                />
                <label
                  htmlFor="anonymous-voting"
                  className="text-sm font-medium"
                >
                  Anonymous Voting
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={form.formState.isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting
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
