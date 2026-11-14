/*!
 * Chess
 * Copyright (c) Cliff Pyles
 * Released under the MIT License: https://opensource.org/license/mit
 * Original: https://codepen.io/editor/cliffpyles/pen/01a19e25-e438-75a3-a372-c9c67de14514
 */

// Intended use: the lesson list, grouped by strategic theme, showing how far through them you are.
import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ButtonLink, ScreenHead } from "../components/controls.js";
import { BackIcon, CheckMarkIcon, NextIcon } from "../components/icons.js";
import { Stack } from "../components/layout.js";
import { en } from "../locales/en.js";
import { useStore } from "../state/store.js";
import { useBoardInset } from "./shell.js";

export const StudyView = () => {
  const lessons = useStore((state) => state.lessons);
  const done = useStore((state) => state.profile.lessonsDone);
  const ref = useRef<HTMLElement>(null);
  useBoardInset(ref, "left");
  const themes = [...new Set(lessons.map((lesson) => lesson.theme))];
  const finished = lessons.filter((lesson) => done.includes(lesson.id)).length;
  return (
    <main className="screen" ref={ref}>
      <div className="screen-scroll">
        <ScreenHead
          title={en.study.heading}
          lead={en.study.intro}
          back={
            <ButtonLink kind="plain" icon={<BackIcon />} to="/">
              {en.setup.back}
            </ButtonLink>
          }
        />
        <div
          className="study-progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={lessons.length}
          aria-valuenow={finished}
          aria-label={en.study.progress(finished, lessons.length)}
        >
          <span className="note">
            {en.study.progress(finished, lessons.length)}
          </span>
          <span className="study-track">
            <span
              style={{
                transform: `scaleX(${lessons.length ? finished / lessons.length : 0})`
              }}
            />
          </span>
        </div>
        {themes.map((theme) => (
          <Stack as="section" key={theme} gap="tight">
            <h2 className="section-title">{theme}</h2>
            <div className="rows">
              {lessons
                .filter((lesson) => lesson.theme === theme)
                .map((lesson) => (
                  <Link
                    key={lesson.id}
                    className="lesson-row"
                    to="/study/$lessonId"
                    params={{ lessonId: lesson.id }}
                  >
                    <span className="lesson-text">
                      <span className="lesson-title">{lesson.title}</span>
                      <span className="lesson-idea">{lesson.idea}</span>
                    </span>
                    <span className="lesson-state">
                      {done.includes(lesson.id) ? (
                        <>
                          <CheckMarkIcon />
                          <span className="visually-hidden">
                            {en.study.done}
                          </span>
                        </>
                      ) : (
                        <NextIcon />
                      )}
                    </span>
                  </Link>
                ))}
            </div>
          </Stack>
        ))}
      </div>
    </main>
  );
};
