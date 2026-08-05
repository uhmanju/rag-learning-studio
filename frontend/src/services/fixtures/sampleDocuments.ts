export interface SampleDocumentDefinition {
  id: string;
  icon: string;
  name: string;
  description: string;
  /** What this document is specifically good at demonstrating — shown in
   *  the picker so a learner can choose based on what they want to learn,
   *  not just a filename. */
  teaches: string[];
  /** Honest, per-document assessment of how well this pipeline's
   *  intentionally simple parser handles it — not a quality judgment on
   *  the document itself. "clean" = should parse well; "challenging" =
   *  known real quirks (OCR noise, figures, cross-references, appendix
   *  boundaries) that this parser doesn't fully preserve. Shown in the
   *  picker so an odd-looking parse result reads as an expected,
   *  documented limitation rather than a bug. */
  difficulty: "clean" | "moderate" | "challenging";
  /** One-to-few sentences explaining *why* that difficulty rating. Each
   *  of these 4 documents self-reports its own difficulty tier (Beginner
   *  through Expert) and "best for" stages on its own page 1 — quoted
   *  here rather than independently re-assessed, since the benchmark
   *  suite's own author calibrated these deliberately. */
  difficultyNote: string;
  pages: Record<number, string>;
  /** Static asset path to the real PDF this sample's text was extracted
   *  from (served from /public/samples). Lets Demo Mode render the
   *  actual original PDF on Parse, the same way Offline Mode does for a
   *  real upload, instead of only showing extracted text. */
  pdfUrl: string;
}

// ---------------------------------------------------------------------------
// A 4-document benchmark suite (fictional company/product names — built
// specifically as safe, license-free RAG test material, not real-world
// documents), ordered by the difficulty each one self-reports on its own
// page 1: Beginner -> Intermediate -> Advanced -> Expert. Page boundaries
// below match each real PDF's real page breaks (extracted with
// pdftotext), so Parse's page-by-page real PDF render and this extracted
// text line up page-for-page.
// ---------------------------------------------------------------------------

const FALCONTEST_GUIDE_PAGES: Record<number, string> = {
  1: `                              FalconTest
                          Automation Framework Guide


                            Meridian Quality Systems
                Product Documentation · Version 4.2 · Beginner Guide




About This Document

   Difficulty                ★ Beginner

   Best for                  Parsing, Markdown, Tables, Basic Chunking, Basic Retrieval

   Approximate Chunks        25

   Estimated Embeddings      25

   Recommended RAG Stages    Parsing → Chunking → Retrieval




                                                                                          Page 1`,
  2: `Meridian Quality Systems — FalconTest Documentation   Version 4.2




 Table of Contents
 1. Introduction to FalconTest
 2. Core Architecture
 3. Installation
 4. Execution Modes
 5. Smart Retry
 6. Configuration Reference
 7. Reporting
 8. Best Practices
 9. Glossary
 10. Questions to Try




FalconTest Automation Framework Guide                     Page 2`,
  3: `Meridian Quality Systems — FalconTest Documentation                                                               Version 4.2




    1. Introduction to FalconTest
    FalconTest is a test automation framework developed by Meridian Quality Systems (MQS) for functional and
    regression testing of web and API-based applications. It is designed to give QA engineers a single framework
    that can drive browser-based tests, validate API responses, and orchestrate suite execution across distributed
    infrastructure.

    FalconTest was first released as version 1.0 in 2019 and has since become the primary automation framework
    used across MQS's internal product teams, including the teams responsible for APIVerify and MockBridge.


          NOTE: FalconTest is a fictional product created for this documentation suite. Any resemblance to real
          automation tools is coincidental.



    1.1 Design Goals
    FalconTest was built around three design goals:

•     Simplicity — a test should be readable by someone who did not write it.

•     Determinism — a passing test should pass consistently, and a failing test should fail for a real reason.

•     Portability — the same test suite should run locally, in a container, or on ClusterGrid without modification.


    1.2 Where FalconTest Fits
    FalconTest sits at the center of the MQS testing ecosystem. It integrates with APIVerify for contract-level API
    checks and with BuildFlow for continuous integration scheduling. Execution itself takes place on ClusterGrid,
    MQS's distributed execution infrastructure.




                                          [Architecture Diagram Placeholder]



                               Figure 1: FalconTest's position within the MQS testing ecosystem.




FalconTest Automation Framework Guide                                                                                 Page 3`,
  4: `Meridian Quality Systems — FalconTest Documentation                                                                     Version 4.2




 2. Core Architecture
 FalconTest is composed of four primary components.

        Component                            Responsibility

        Test Runner                          Loads and executes test definitions

        Execution Cluster                    Schedules and distributes test runs across available workers

        Reporting Cluster                    Aggregates results and generates reports

        Config Loader                        Resolves configuration from files, environment variables, and CLI flags


         NOTE: FalconTest documentation distinguishes between the Execution Cluster, which is responsible for
         running tests, and the Reporting Cluster, which is responsible for aggregating and publishing results. Both
         are part of ClusterGrid but serve different purposes. This distinction matters when troubleshooting — a slow
         test run is usually an Execution Cluster issue, while a missing report is usually a Reporting Cluster issue.



 2.1 Test Runner
 The Test Runner is the component that parses test files, resolves fixtures, and executes test steps in order. It
 supports both a declarative YAML test format and a scripted Python format.


 2.2 Execution Cluster
 The Execution Cluster receives test jobs from the Test Runner and distributes them across available worker
 nodes on ClusterGrid. It handles retries, timeouts, and worker health checks.


 2.3 Reporting Cluster
 The Reporting Cluster receives completed test results from the Execution Cluster and compiles them into the
 formats described in Section 7 (Reporting).




                                              [Execution Flow Placeholder]



         Figure 2: How a test job moves from the Test Runner through the Execution Cluster to the Reporting Cluster.




FalconTest Automation Framework Guide                                                                                       Page 4`,
  5: `Meridian Quality Systems — FalconTest Documentation                                                               Version 4.2




 3. Installation
 FalconTest is distributed as a Python package and can be installed using the standard package manager.

          pip install falcontest==4.2.0

 After installation, verify the CLI is available:

          falcontest --version

 Expected output:

          FalconTest CLI 4.2.0



 3.1 Minimum Requirements

        Requirement                                    Minimum Version

        Python                                         3.9

        Operating System                               Windows, macOS

        Memory                                         4 GB RAM

        Disk Space                                     500 MB


         TIP: FalconTest 4.2 requires Python 3.9 or later. Attempting to install on Python 3.8 will fail with a
         dependency resolution error.



 3.2 Initializing a Project
 Once installed, a new FalconTest project is created with:

          falcontest init my-project

 This generates a default project structure:

          my-project/
          falcontest.yaml
          tests/
          example_test.yaml
          fixtures/
          reports/




FalconTest Automation Framework Guide                                                                                 Page 5`,
  6: `Meridian Quality Systems — FalconTest Documentation                                                                    Version 4.2




 4. Execution Modes
 FalconTest supports two execution modes: Passive and Adaptive. Choosing the right mode affects both how
 quickly a suite runs and how it behaves under flaky conditions.


 4.1 Passive Mode
 In Passive mode, FalconTest executes each test exactly once, in the order defined, with no automatic retry and
 no adjustment to scheduling based on prior results. Passive mode is deterministic and predictable, which
 makes it well suited to smoke tests where a failure should be visible immediately rather than retried.


 4.2 Adaptive Mode
 In Adaptive mode, FalconTest monitors test outcomes as a suite runs and adjusts scheduling dynamically. If a
 test fails, Adaptive mode will consult the Smart Retry policy (see Section 5) before deciding whether to re-run it.
 Adaptive mode also reorders remaining tests to run known-flaky tests earlier in the suite, so that retries do not
 push the total suite duration past its allotted window.


 4.3 Comparing Passive and Adaptive Modes

        Aspect                           Passive Mode                             Adaptive Mode

        Retry behavior                   None                                     Governed by Smart Retry

        Scheduling                       Fixed order                              Dynamically reordered

        Best for                         Smoke tests, CI gates                    Full regression suites

        Predictability                   High                                     Moderate

        Typical suite duration           Shorter, fixed                           Variable


         TIP: Use Passive mode for pull-request gating checks where a fast, deterministic signal matters more than
         tolerance for flakiness. Use Adaptive mode for nightly or scheduled regression suites where total pass rate
         matters more than individual run time.




FalconTest Automation Framework Guide                                                                                      Page 6`,
  7: `Meridian Quality Systems — FalconTest Documentation                                                               Version 4.2




 5. Smart Retry
 Smart Retry is the retry policy engine used by Adaptive mode. When a test fails, Smart Retry evaluates the
 failure against a small set of rules before deciding whether to retry it.


 5.1 How Smart Retry Works
 Smart Retry does not retry every failure. It first checks whether the failure matches a known transient failure
 signature — for example, a network timeout or a temporary element-not-found error in a browser test. If the
 failure matches a transient signature, Smart Retry schedules a retry. If the failure does not match a transient
 signature (for example, an assertion failure comparing expected and actual values), Smart Retry does not retry
 it, since retrying a genuine assertion failure would only waste execution time.


 5.2 Retry Limit
 In version 4.2, Smart Retry is configured with a default retry limit of 3 attempts per test. This value can be
 overridden per-suite in falcontest.yaml.

          smart_retry:
          enabled: true
          max_attempts: 3
          backoff_seconds: 5


         WARNING: Setting max_attempts too high in a large suite can significantly increase total run time when
         many tests hit transient failures simultaneously, such as during a shared environment outage.




FalconTest Automation Framework Guide                                                                                 Page 7`,
  8: `Meridian Quality Systems — FalconTest Documentation                                                     Version 4.2




 6. Configuration Reference
 FalconTest configuration is defined in falcontest.yaml at the project root.

        Key                                Type       Default    Description

        execution_mode                     string     passive    Either passive or adaptive

        smart_retry.enabled                boolean    false      Enables Smart Retry (Adaptive mode only)

        smart_retry.max_attempts           integer    3          Maximum retry attempts per test

        cluster.workers                    integer    4          Number of ClusterGrid workers to request

        report.format                      string     html       Output format: html, json, or junit


 Example configuration:

          execution_mode: adaptive
          smart_retry:
          enabled: true
          max_attempts: 3
          cluster:
          workers: 8
          report:
          format: html




FalconTest Automation Framework Guide                                                                       Page 8`,
  9: `Meridian Quality Systems — FalconTest Documentation                                                                   Version 4.2




    7. Reporting
    After a suite completes, the Reporting Cluster compiles results into a report. FalconTest supports three report
    formats.

          Format                    Use Case

          HTML                      Human-readable report with pass/fail breakdown and timing charts

          JSON                      Machine-readable output for downstream tooling

          JUnit XML                 Compatible with most CI dashboards, including BuildFlow


          NOTE: JUnit XML output from FalconTest is compatible with BuildFlow's built-in test result visualization.




    8. Best Practices
•     Keep Passive mode as the default for any pipeline stage that gates a merge.

•     Reserve Adaptive mode with Smart Retry for scheduled, unattended runs.

•     Set cluster.workers based on the number of independent test files, not the number of individual test
      cases.

•     Review Smart Retry's transient-failure signatures periodically; a signature that was accurate at release time
      can go stale as the application under test changes.




FalconTest Automation Framework Guide                                                                                     Page 9`,
  10: `Meridian Quality Systems — FalconTest Documentation                                                               Version 4.2




 9. Glossary
        Term                               Definition

        ClusterGrid                        MQS's distributed execution infrastructure that runs FalconTest jobs

        Execution Cluster                  The ClusterGrid component that schedules and runs tests

        Reporting Cluster                  The ClusterGrid component that aggregates results into reports

        Smart Retry                        FalconTest's retry policy engine, used in Adaptive mode

        Transient failure signature        A pattern Smart Retry uses to identify failures worth retrying

        Passive Mode                       Execution mode with no retries and fixed test ordering

        Adaptive Mode                      Execution mode with dynamic scheduling and Smart Retry support




FalconTest Automation Framework Guide                                                                               Page 10`,
  11: `Meridian Quality Systems — FalconTest Documentation                                                  Version 4.2




 10. Questions to Try
 The following questions are provided to help you explore this document using your own RAG pipeline. No
 answers are provided here — try retrieving and generating answers yourself.


 1 What is FalconTest Smart Retry?
 2 How does Adaptive mode decide whether to retry a failed test?
 3 Compare Passive and Adaptive execution modes.
 4 Which execution mode is recommended for scheduled regression suites?
 5 What is the default value of smart_retry.max_attempts in version 4.2?
 6 Which Cluster is responsible for test execution?
 7 Does FalconTest support Linux?
 8 What are the minimum system requirements to install FalconTest?
 9 What report formats does FalconTest support?
 10 What is the difference between the Execution Cluster and the Reporting Cluster?




FalconTest Automation Framework Guide                                                                     Page 11`,
};

const APIVERIFY_HANDBOOK_PAGES: Record<number, string> = {
  1: `                                          APIVerify
                                    Integration Handbook


                                Meridian Quality Systems
                  Product Documentation · Version 2.3 · Intermediate Guide




About This Document

     Difficulty                      ★★ Intermediate

     Best for                        Chunking, Chunk Overlap, Semantic Retrieval, Multi-Chunk Synthesis

     Approximate Chunks              45

     Estimated Embeddings            45

     Recommended RAG Stages          Chunking → Chunk Overlap → Semantic Retrieval

This handbook uses longer paragraphs and cross-page explanations, so some questions require retrieving and
combining more than one chunk to answer correctly.




                                                                                                          Page 1`,
  2: `Meridian Quality Systems — APIVerify Documentation   Version 2.3




 Table of Contents
 1. Introduction to APIVerify
 2. Core Concepts
 3. Installation and Setup
 4. Verification Modes
 5. Baseline Sync
 6. Drift Detection
 7. Configuration Reference
 8. Integration with MockBridge and FalconTest
 9. Reporting and Dashboards
 10. Best Practices
 11. Glossary
 12. Questions to Try




APIVerify Integration Handbook                           Page 2`,
  3: `Meridian Quality Systems — APIVerify Documentation                                                           Version 2.3




 1. Introduction to APIVerify
 APIVerify is a contract-testing framework built by Meridian Quality Systems to validate that a REST API's real
 behavior continues to match the contract its consumers were promised. Where FalconTest is concerned with
 driving end-to-end test execution across browsers and services, APIVerify focuses narrowly on one question:
 does this endpoint, right now, return what the contract says it should return? That narrower scope is what lets
 APIVerify run quickly and frequently — often on every commit — rather than only in scheduled regression
 windows.

 A contract, in APIVerify terminology, is a structured description of an endpoint's expected request shape,
 response shape, status codes, and headers. Contracts are written once by the team that owns an API and are
 then continuously checked against the live service. When a live response no longer matches its contract,
 APIVerify calls this drift, and the process of catching it is called Drift Detection, which is covered in detail in
 Section 6.

 APIVerify was introduced in 2020 as an internal tool for the team building MockBridge, MQS's service
 virtualization product, and was later generalized into a standalone framework used across most MQS API
 teams. Documentation and release notes for APIVerify are published at
 https://docs.meridianqs.com/apiverify/.


 1.1 Why Contract Testing Matters
 Traditional end-to-end tests catch problems only when a full user journey breaks, which is often too late and too
 expensive to diagnose quickly. Contract tests catch a much narrower and more specific class of problem — an
 API silently changing shape — much earlier, typically before a consumer application ever notices. This is
 especially valuable in organizations where the team consuming an API is different from the team producing it,
 since a contract acts as an explicit, checkable agreement between the two rather than an informal
 understanding that can quietly drift out of sync as both sides evolve independently over time.




APIVerify Integration Handbook                                                                                   Page 3`,
  4: `Meridian Quality Systems — APIVerify Documentation                                                         Version 2.3




 2. Core Concepts
 Before installing APIVerify, it helps to understand three core concepts that recur throughout this handbook:
 Contract Definitions, Endpoint Groups, and Baselines. These three concepts build on one another, and
 later sections assume familiarity with all three.


 2.1 Contract Definitions
 A Contract Definition is a YAML or JSON file describing exactly what an endpoint is expected to return. A
 minimal contract definition looks like this:

           contract: get-user-profile
           endpoint: GET /v1/users/{id}
           expected_status: 200
           response_schema:
           type: object
           required: [id, email, created_at]
           properties:
           id: { type: string }
           email: { type: string }
           created_at: { type: string, format: date-time }

 Contract Definitions are stored alongside application code, typically in a contracts/ directory, and are
 versioned in source control just like any other artifact.


 2.2 Endpoint Groups
 Related endpoints are organized into an Endpoint Group, which allows a team to run verification against a
 logical slice of an API rather than the entire surface at once. A typical service might define an Endpoint Group
 called users, containing every contract related to user profile management, and a separate group called
 billing, containing contracts related to invoicing and payments.

 Endpoint Groups matter for two practical reasons: they let teams parallelize verification runs across CI jobs, and
 they let a team scope a single verification run to only the part of the API they are actively changing, rather than
 re-checking an entire service on every commit.


 2.3 Baselines
 APIVerify uses the word Baseline in two related but distinct senses, and this handbook is careful to distinguish
 them because confusing the two is a common source of misconfiguration.

 A Contract Baseline is the accepted, known-good version of a Contract Definition — effectively a snapshot of
 what the contract looked like the last time a human reviewer approved it. A Performance Baseline is a
 separate, optional snapshot of an endpoint's typical response time, used only when latency checks are
 enabled. Section 5 (Baseline Sync) covers the Contract Baseline in depth; Performance Baselines are a
 smaller, opt-in feature described briefly in Section 7.




APIVerify Integration Handbook                                                                                  Page 4`,
  5: `Meridian Quality Systems — APIVerify Documentation                                                                     Version 2.3




 3. Installation and Setup
 APIVerify is distributed as a Python package, consistent with the rest of the MQS testing toolchain.

           pip install apiverify==2.3.0

 After installation, initialize a project:

           apiverify init my-api-contracts

 This creates the following structure:

           my-api-contracts/
           apiverify.yaml
           contracts/
           users/
           billing/
           baselines/



 3.1 Minimum Requirements

        Requirement                                   Minimum Version

        Python                                        3.9

        Operating System                              Windows, macOS, Linux

        Memory                                        2 GB RAM

        Network Access                                Outbound HTTPS to target API


         NOTE: Unlike FalconTest, which at the time of the FalconTest 4.2 guide supported only Windows and macOS,
         APIVerify 2.3 supports Linux as well. This is a deliberate platform difference between the two products, not an
         inconsistency — each product's supported platforms should be checked independently rather than assumed to
         match.



 3.2 Initial Configuration
 On first run, APIVerify prompts for a target base URL and, optionally, an authentication token. These are stored
 in apiverify.yaml:

           base_url: https://api.example.com
           auth:
           type: bearer
           token_env_var: API_TOKEN
           verification:
           timeout_ms: 8000
           retry:
           max_attempts: 2




APIVerify Integration Handbook                                                                                             Page 5`,
  6: `Meridian Quality Systems — APIVerify Documentation                                                       Version 2.3



 The verification.timeout_ms and verification.retry.max_attempts values shown above were
 the defaults at the time APIVerify 2.0 was released. As covered later in Section 7, these defaults were revised
 in version 2.3.




APIVerify Integration Handbook                                                                               Page 6`,
  7: `Meridian Quality Systems — APIVerify Documentation                                                                       Version 2.3




 4. Verification Modes
 APIVerify can run in one of two verification modes: Strict Mode and Lenient Mode. The choice of mode
 changes how APIVerify treats fields that appear in a live response but are not declared in the contract.


 4.1 Strict Mode
 In Strict Mode, any field present in the live response that is not explicitly declared in the Contract Definition's
 schema is treated as a verification failure. Strict Mode is the more conservative option: it guarantees that a
 contract fully and exactly describes a response shape, with nothing undocumented slipping through. Teams
 that treat their contracts as the authoritative source of truth for API documentation generally prefer Strict Mode,
 since any drift — even the addition of a harmless new field — is surfaced immediately.


 4.2 Lenient Mode
 In Lenient Mode, extra fields in the live response that are not declared in the contract are ignored, and only the
 fields that are declared are checked for correctness. Lenient Mode is better suited to APIs that are actively
 evolving, where new fields are added frequently and a team does not want every addition to trigger a failed
 verification run. The tradeoff is that Lenient Mode can allow genuine, unintentional schema drift to go unnoticed
 for longer, since only declared fields are ever checked.


 4.3 Choosing a Mode

        Aspect                            Strict Mode                              Lenient Mode

        Undeclared fields                 Fail verification                        Ignored

        Best for                          Stable, well-documented APIs             Rapidly evolving APIs

        False positive rate               Higher                                   Lower

        Drift visibility                  Immediate                                Delayed until a declared field
                                                                                   changes


         TIP: A common pattern at MQS is to run new Endpoint Groups in Lenient Mode for their first few weeks, then
         switch to Strict Mode once the contract has stabilized. This is covered in more detail in Section 8, where it
         intersects with MockBridge stub generation.




APIVerify Integration Handbook                                                                                               Page 7`,
  8: `Meridian Quality Systems — APIVerify Documentation                                                         Version 2.3




 5. Baseline Sync
 Baseline Sync is the process by which APIVerify reconciles a Contract Definition's Baseline with the current
 state of the live API, and it is one of the concepts in this handbook most likely to span a page boundary, so read
 this section together with Section 5 (continued) below.

 The Baseline Sync process runs in four steps:

 1 Fetch — APIVerify sends a request to the live endpoint using any example parameters defined in the
      contract.

 2 Compare — the live response is compared against the current Contract Baseline, field by field, using the
      verification mode (Strict or Lenient) configured for that Endpoint Group.

 3 Flag — if a discrepancy is found, APIVerify does not automatically update the Baseline. Instead, it flags the
      discrepancy for human review, since an unreviewed automatic update could silently accept a real
      regression as if it were an intentional change.




APIVerify Integration Handbook                                                                                 Page 8`,
  9: `Meridian Quality Systems — APIVerify Documentation                                                          Version 2.3




 5.1 Baseline Sync (continued)
 4 Approve or Reject — a reviewer examines the flagged discrepancy and either approves it, which updates
      the Contract Baseline to match the new live response, or rejects it, which leaves the Baseline unchanged
      and treats the live response as a genuine regression that needs to be fixed in the API itself rather than in
      the contract.

 This four-step approval workflow is intentional: APIVerify treats the Contract Baseline as something that should
 only ever change through explicit human approval, never automatically. This is the single most important design
 decision in APIVerify's Baseline Sync process, because it is what prevents contract drift from silently becoming
 the new accepted normal simply because nobody objected to it.

 Baseline Sync runs are triggered manually via apiverify sync, or automatically on a schedule if
 sync.auto_schedule is enabled in apiverify.yaml. MQS's internal guidance recommends running
 Baseline Sync manually rather than on an automatic schedule for any Endpoint Group still in Strict Mode,
 precisely because Strict Mode discrepancies are more likely to represent a genuine problem worth a human's
 immediate attention rather than routine drift.




APIVerify Integration Handbook                                                                                  Page 9`,
  10: `Meridian Quality Systems — APIVerify Documentation                                                                         Version 2.3




 6. Drift Detection
 Drift Detection is the umbrella term for APIVerify's continuous checking of live API responses against Contract
 Baselines, and it is powered by the same Fetch-Compare-Flag mechanism described in Section 5. The
 difference between Baseline Sync and Drift Detection is one of intent rather than mechanism: Baseline Sync is
 run deliberately, when a team expects the contract may need updating, while Drift Detection runs continuously
 (or on every CI build) specifically to catch unexpected changes.


 6.1 Drift Severity Levels
 Not all drift is equally serious. APIVerify classifies detected drift into three severity levels.

        Severity             Meaning                                                Example

        Info                 A new, undeclared field appeared (Lenient Mode         A metadata field added to a response
                             only)

        Warning              A declared field's type changed in a                   An integer field now also accepts null
                             backward-compatible way

        Critical             A declared field was removed, renamed, or              The email field was removed entirely
                             changed status code


         WARNING: Critical drift always fails a verification run regardless of whether the Endpoint Group is running in
         Strict or Lenient Mode. The Strict/Lenient distinction only affects how undeclared fields are treated — it does not
         affect how declared-field regressions are treated.




APIVerify Integration Handbook                                                                                                 Page 10`,
  11: `Meridian Quality Systems — APIVerify Documentation                                                                  Version 2.3




 7. Configuration Reference
 Full configuration for APIVerify lives in apiverify.yaml.

        Key                              Type        Default     Default      Description
                                                     (v2.0)      (v2.3)

        verification.timeout_ms          integer     8000        10000        Timeout in ms

        verification.retry.max_attem     integer     2           3            Retry attempts
        pts

        verification.mode                string      strict      strict       Default mode for new groups

        sync.auto_schedule               string      disabled    disabled     Cron for auto Baseline Sync

        performance_baseline.enabl       boolean     false       false        Enables Performance Baseline
        ed


         NOTE: APIVerify 2.3 raised both verification.timeout_ms and verification.retry.max_attempts
         from their 2.0 defaults. Any configuration reference to the timeout or retry count elsewhere in MQS
         documentation should be understood as describing the version in effect at the time it was written; this table
         reflects the current, version 2.3 defaults unless otherwise noted.



 7.1 Performance Baselines
 When performance_baseline.enabled is set to true, APIVerify additionally records response-time
 percentiles for each endpoint and flags a Warning-level drift event if p95 latency exceeds the recorded
 Performance Baseline by more than 50%. Performance Baselines are stored separately from Contract
 Baselines and are not subject to the Baseline Sync approval workflow described in Section 5, since a temporary
 latency spike does not require the same deliberate human review as a schema change.




APIVerify Integration Handbook                                                                                           Page 11`,
  12: `Meridian Quality Systems — APIVerify Documentation                                                                    Version 2.3




 8. Integration with MockBridge and FalconTest
 APIVerify is designed to work alongside two other MQS products.

 MockBridge can generate a service virtualization stub directly from a Contract Definition, which allows
 consumer teams to develop and test against a realistic mock of an API before the real implementation is
 finished. When a contract's Baseline is updated through Baseline Sync (Section 5), MockBridge stubs
 generated from that contract can be regenerated automatically to stay in sync, avoiding a situation where a
 consumer team is developing against a stub that no longer matches the real API's approved contract.

 FalconTest can invoke APIVerify checks as a step within a broader end-to-end test suite, using the
 apiverify_check fixture. This lets a FalconTest suite fail fast on a contract violation before proceeding to a
 slower, full end-to-end scenario that depends on that same endpoint behaving correctly. Verification jobs
 invoked this way run on FalconTest's Execution Cluster (see the FalconTest Automation Framework Guide,
 Section 2) rather than as a separate standalone process.

         TIP: For CI pipelines that run on every commit, run new or actively-changing Endpoint Groups in Lenient Mode
         through APIVerify directly, and reserve FalconTest's apiverify_check fixture — with the target Endpoint
         Group set to Strict Mode — for the smaller set of stable, contract-complete APIs where any drift at all should
         block a merge.




APIVerify Integration Handbook                                                                                            Page 12`,
  13: `Meridian Quality Systems — APIVerify Documentation                                                                   Version 2.3




    9. Reporting and Dashboards
    APIVerify publishes verification results in the same three formats supported by FalconTest — HTML, JSON,
    and JUnit XML — for consistency across the MQS toolchain, plus one format unique to APIVerify.

          Format                  Description

          HTML                    Interactive report with per-endpoint drift history

          JSON                    Machine-readable output for downstream tooling

          JUnit XML               Compatible with BuildFlow's test result visualization

          Drift Timeline          Web dashboard showing drift events across all Endpoint Groups over time, available at
                                  https://apiverify.internal.meridianqs.com/timeline


    The Drift Timeline dashboard is the primary tool teams use to spot slow, gradual drift that individual verification
    runs might not make obvious in isolation, since it aggregates results across many runs rather than showing only
    the outcome of the most recent one.



    10. Best Practices
•     Start new Endpoint Groups in Lenient Mode, and graduate to Strict Mode once the contract has stabilized.

•     Never enable sync.auto_schedule for an Endpoint Group running in Strict Mode; require manual review
      instead.

•     Treat Critical-severity drift as a build-blocking failure regardless of verification mode.

•     Enable Performance Baselines only for endpoints with well-understood, stable latency characteristics, since a
      noisy endpoint will generate frequent false-positive Warning events.

•     When integrating with FalconTest via apiverify_check, reserve Strict Mode targets for genuinely stable
      APIs to avoid frequent, low-value suite failures.




APIVerify Integration Handbook                                                                                            Page 13`,
  14: `Meridian Quality Systems — APIVerify Documentation                                                                    Version 2.3




 11. Glossary
        Term                               Definition

        Contract Definition                A YAML or JSON file describing an endpoint's expected request/response
                                           shape

        Endpoint Group                     A logical grouping of related contracts, used to scope verification runs

        Contract Baseline                  The accepted, known-good version of a Contract Definition

        Performance Baseline               An optional snapshot of an endpoint's typical response time

        Drift                              Any deviation between a live API response and its Contract Baseline

        Drift Detection                    The continuous process of checking live responses against Contract
                                           Baselines

        Baseline Sync                      The deliberate, human-reviewed process of updating a Contract Baseline

        Strict Mode                        Verification mode that fails on any undeclared field

        Lenient Mode                       Verification mode that ignores undeclared fields




APIVerify Integration Handbook                                                                                          Page 14`,
  15: `Meridian Quality Systems — APIVerify Documentation                                                   Version 2.3




 12. Questions to Try
 The following questions are provided to help you explore this document using your own RAG pipeline. No
 answers are provided here — try retrieving and generating answers yourself.


 1 What is a Contract Definition in APIVerify?
 2 How does the Baseline Sync approval workflow prevent silent contract drift?
 3 Compare Strict Mode and Lenient Mode.
 4 Which verification mode should a team use when integrating a new, rapidly-changing Endpoint Group with
      FalconTest's apiverify_check fixture?

 5 What is the current default value of verification.retry.max_attempts in APIVerify 2.3?
 6 What is a Baseline in APIVerify — the Contract Baseline or the Performance Baseline?
 7 Does APIVerify support GraphQL APIs?
 8 What operating systems does APIVerify 2.3 support?
 9 What are the three Drift severity levels, and which one always fails a verification run?
 10 How does APIVerify's Drift Detection differ from Baseline Sync?




APIVerify Integration Handbook                                                                            Page 15`,
};

const AI_TESTING_RAG_PLAYBOOK_PAGES: Record<number, string> = {
  1: `                   AI Testing & RAG Playbook
                                      A Guide to InsightIQ


                               Meridian Quality Systems
                  Product Documentation · Version 1.6 · Advanced Guide




About This Document

     Difficulty                      ★★★ Advanced

     Best for                        Embeddings, Retrieval Strategy Comparison, Prompt Construction, Complex Parsing

     Approximate Chunks              70

     Estimated Embeddings            70

     Recommended RAG Stages          Embedding → Retrieval → Prompt Construction → Parsing

This document introduces figures, diagrams, cross-references, and appendices, and is designed to
demonstrate why parsing quality has an outsized effect on downstream retrieval.




                                                                                                       Page 1`,
  2: `Meridian Quality Systems — InsightIQ Documentation   Version 1.6




 Table of Contents
 1. Introduction to InsightIQ
 2. RAG Architecture Overview
 3. Embeddings
 4. Retrieval Strategies
 5. Prompt Construction
 6. Evaluation Metrics
 7. Parsing Considerations
 8. Deployment Patterns
 9. Case Study: Documentation Search
 10. Best Practices
 Appendix A — Extended Glossary
 Appendix B — Sample End-to-End Configuration
 References
 Questions to Try




AI Testing & RAG Playbook                                Page 2`,
  3: `Meridian Quality Systems — InsightIQ Documentation                                                         Version 1.6




 1. Introduction to InsightIQ
 InsightIQ is Meridian Quality Systems' platform for constructing, tuning, and evaluating Retrieval-Augmented
 Generation pipelines. Where FalconTest and APIVerify test conventional software behavior, InsightIQ exists
 because RAG systems fail in ways that conventional test suites are not built to catch: a RAG pipeline can pass
 every unit test and still return confidently wrong answers if retrieval surfaces the wrong context, or if a prompt
 template buries the retrieved context in a way the underlying model ignores.

 InsightIQ was built by the same internal team that maintains this documentation suite, and — in a detail worth
 noting for anyone testing retrieval on this very document — InsightIQ is the system MQS uses internally to
 index and search its own FalconTest, APIVerify, and Engineering Standards documentation. That means the
 platform described in this playbook is, among other things, describing itself.


 1.1 Scope of This Playbook
 This playbook covers four pipeline stages in depth — Embeddings (Section 3), Retrieval (Section 4), Prompt
 Construction (Section 5), and Evaluation (Section 6) — and one supporting concern, Parsing (Section 7), which
 earlier documents in this suite deliberately avoided testing in depth. See Figure 1 for how these stages relate to
 one another end to end.




                                           [Architecture Diagram Placeholder]



                       Figure 1: End-to-end InsightIQ pipeline, from raw document to generated answer.




AI Testing & RAG Playbook                                                                                      Page 3`,
  4: `Meridian Quality Systems — InsightIQ Documentation                                                                   Version 1.6




 2. RAG Architecture Overview
 An InsightIQ pipeline is composed of five stages, executed in order for indexing and a subset of them again at
 query time.

        Stage                Runs at Index Time       Runs at Query Time        Output

        Parsing              Yes                      No                        Structured text and tables

        Chunking             Yes                      No                        Fixed or variable-size text chunks

        Embedding            Yes                      Yes (for the query)       Dense vector representations

        Retrieval            No                       Yes                       Ranked list of candidate chunks

        Generation           No                       Yes                       Final natural-language answer




                                         [UML Sequence Diagram Placeholder]



             Figure 2: Sequence diagram showing index-time and query-time flows through the InsightIQ pipeline.


 2.1 Index-Time vs. Query-Time
 A common point of confusion for teams new to InsightIQ is assuming Embedding happens only once, at index
 time. In fact, Embedding runs twice in the lifecycle of a single query: once for every chunk at index time, and
 once more for the incoming query itself at query time, so that the query's vector can be compared against the
 chunk vectors already stored in the vector index. See Section 3.3 for why using the same embedding model for
 both is a hard requirement, not a recommendation.




AI Testing & RAG Playbook                                                                                                Page 4`,
  5: `Meridian Quality Systems — InsightIQ Documentation                                                                            Version 1.6




 3. Embeddings
 InsightIQ ships with two supported embedding models.

             Model                Dimensio       Relative         Relative          Recommended Use
                                  ns             Speed            Accuracy

             VectorCore-S         384            Fast             Good              Local dev, small corpora (<10,000
                                                                                    chunks)

             VectorCore-L         1024           Slower           Higher            Production, large corpora


 3.1 VectorCore-S
 VectorCore-S is a compact embedding model optimized for fast, local iteration. It produces 384-dimensional
 vectors and can embed roughly 2,000 chunks per second on a single CPU core, making it the default for
 InsightIQ's local development mode, where fast feedback matters more than squeezing out the last few points
 of retrieval accuracy.


 3.2 VectorCore-L
 VectorCore-L produces 1024-dimensional vectors and is meaningfully more accurate on InsightIQ's internal
 benchmark suite, at roughly one-third the throughput of VectorCore-S. It is the recommended model for any
 production deployment, and is the model InsightIQ itself uses to index the MQS documentation suite that this
 playbook is part of.


 3.3 Embedding Model Consistency
 A vector index built with one embedding model cannot be meaningfully queried using vectors from a different
 embedding model, because different models place semantically similar text at different coordinates in different,
 incompatible vector spaces. InsightIQ enforces this: the embedding model used to build an index is recorded in
 the index's metadata, and InsightIQ will refuse to run a query against an index using a different model than the
 one it was built with, raising a ModelMismatchError rather than silently returning meaningless results.

         WARNING: Switching an InsightIQ project from VectorCore-S to VectorCore-L (for example, when moving from
         local development to production) requires a full re-index of the corpus. There is no supported migration path that
         reuses VectorCore-S vectors with VectorCore-L.




AI Testing & RAG Playbook                                                                                                         Page 5`,
  6: `Meridian Quality Systems — InsightIQ Documentation                                                           Version 1.6




 3.4 Chunk Size and Embedding Quality
 Chunk size, set during the Chunking stage described in Section 2, has a direct effect on embedding quality.
 Chunks that are too small lose surrounding context, causing their embeddings to be ambiguous. Chunks that
 are too large mix multiple topics into a single vector, causing their embeddings to be diluted and less
 discriminative for any single topic within them. InsightIQ's internal benchmarking, run against the same
 ten-document corpus that includes this document, found that chunks between 400 and 700 characters
 produced the best retrieval accuracy for VectorCore-L; results for VectorCore-S followed a similar pattern but
 peaked slightly lower, between 350 and 600 characters.



 4. Retrieval Strategies
 InsightIQ supports three retrieval strategies, which can be used individually or combined.

 4.1 Dense Retrieval
 Dense Retrieval compares the query's embedding vector against every chunk's embedding vector using cosine
 similarity, returning the top-K most similar chunks. It is the default strategy and captures semantic similarity well
 — a query about "adjusting how often failed tests are re-run" can match a chunk about "Smart Retry" even
 without any shared keywords, because the embeddings capture meaning rather than exact wording.


 4.2 Keyword Retrieval
 Keyword Retrieval uses a traditional inverted-index term-matching approach (specifically, BM25 scoring) and is
 included primarily as a fallback for queries containing exact identifiers — configuration keys, error codes, or
 product names — that a purely semantic match might rank too low. See Figure 3 for a visual comparison of how
 Dense and Keyword retrieval rank the same query differently.




                                             [Comparison Chart Placeholder]



         Figure 3: Ranking comparison between Dense Retrieval and Keyword Retrieval for the same sample query.




AI Testing & RAG Playbook                                                                                        Page 6`,
  7: `Meridian Quality Systems — InsightIQ Documentation                                                                      Version 1.6




 4.3 Hybrid Retrieval
 Hybrid Retrieval runs both Dense and Keyword retrieval in parallel and merges their ranked results using a
 weighted combination, controlled by a single tunable parameter, hybrid_alpha, ranging from 0 (pure
 keyword) to 1 (pure dense). InsightIQ's default value for hybrid_alpha is 0.7, favoring dense retrieval while
 still giving keyword matches meaningful influence.


 4.4 Choosing a Retrieval Strategy
            Strategy         Strength                     Weakness                      Best For

            Dense            Captures semantic            Can miss exact identifiers    Conceptual, natural-language
                             meaning                                                    queries

            Keyword          Exact identifier matching    Misses paraphrased            Config keys, error codes,
                                                          queries                       product names

            Hybrid           Balances both                Requires tuning               General-purpose production
                                                          hybrid_alpha                  use


         TIP: Start every new InsightIQ project with Hybrid Retrieval at the default hybrid_alpha of 0.7, and only move to
         a pure strategy if evaluation (Section 6) shows a clear, consistent advantage for your specific corpus and query
         patterns.



 4.5 Re-Ranking
 An optional Re-Ranking pass can be applied after any of the three strategies above. Re-Ranking uses a
 smaller, more computationally expensive model to re-score the initial top-K candidates (typically top-20) and
 return a refined top-N (typically top-4 to top-6) for the Prompt Construction stage described next in Section 5.
 Re-Ranking is disabled by default because of its added latency, and is recommended primarily for InsightIQ
 deployments where answer quality matters more than response time — see Section 8 for how this tradeoff is
 typically decided per deployment pattern.




AI Testing & RAG Playbook                                                                                                    Page 7`,
  8: `Meridian Quality Systems — InsightIQ Documentation                                                               Version 1.6




 5. Prompt Construction
 Once Retrieval has returned a ranked list of candidate chunks, InsightIQ assembles them into a prompt for the
 generation model.


 5.1 Prompt Template Structure
 An InsightIQ prompt template has three parts, always assembled in this order: a system instruction, the
 retrieved context, and the user's original query.

          [SYSTEM INSTRUCTION]
          You are a documentation assistant. Answer only using the provided context.
          If the answer is not in the context, say so explicitly.

          [RETRIEVED CONTEXT]
          {{ for chunk in retrieved_chunks }}
          Source: {{ chunk.source }} (page {{ chunk.page }})
          {{ chunk.text }}
          {{ endfor }}

          [USER QUERY]
          {{ query }}



 5.2 Context Window Budgeting
 Every generation model InsightIQ supports has a maximum context window, and the retrieved chunks
 assembled in Section 5.1 must fit within it alongside the system instruction and query. InsightIQ budgets the
 context window using a fixed allocation: 10% reserved for the system instruction, 70% for retrieved context, and
 20% for the query and generated response combined. If the retrieved chunks from Section 4 exceed the 70%
 context budget, InsightIQ truncates from the lowest-ranked chunk upward, never from the highest-ranked chunk
 downward, since the highest-ranked chunk is assumed to be the most relevant to the query.

         NOTE: This 70% context budget is a default, not a hard limit. It can be overridden per-project in
         insightiq.yaml, though MQS's internal guidance recommends against raising it above 80%, since leaving too
         little room for the query and response can cause the generation model to produce truncated or malformed
         answers.



 5.3 Citation Formatting
 InsightIQ instructs the generation model to cite the source and page number of any chunk it draws on, using the
 Source: {{ chunk.source }} (page {{ chunk.page }}) format shown in Section 5.1. This is a
 prompt-level instruction rather than a guarantee — InsightIQ's Evaluation stage (Section 6) includes a specific
 metric, Citation Accuracy, precisely because generation models do not always follow citation instructions
 reliably.




AI Testing & RAG Playbook                                                                                            Page 8`,
  9: `Meridian Quality Systems — InsightIQ Documentation                                                                    Version 1.6




 6. Evaluation Metrics
 InsightIQ tracks four evaluation metrics for a RAG pipeline, computed against a held-out set of question-answer
 pairs.

        Metric                          What It Measures

        Retrieval Precision             Fraction of retrieved chunks that are actually relevant to the query

        Retrieval Recall                Fraction of all relevant chunks that were successfully retrieved

        Answer Faithfulness             Whether the generated answer is fully supported by the retrieved context

        Citation Accuracy               Whether cited sources and page numbers actually contain the claimed information


 6.1 Why Faithfulness and Accuracy Are Tracked Separately
 A generated answer can be faithful to the retrieved context (nothing in the answer contradicts or goes beyond
 what was retrieved) while still citing the wrong source for a specific claim, if the generation model draws the
 correct fact from one retrieved chunk but attributes it to another. This is why InsightIQ tracks Answer
 Faithfulness and Citation Accuracy as two separate metrics rather than a single combined score — a pipeline
 can score well on one and poorly on the other, and the appropriate fix differs depending on which is failing.



 7. Parsing Considerations
 Parsing quality has an outsized effect on every downstream stage in this playbook, which is why this document
 — unlike Documents 1 and 2 in this benchmark suite — deliberately includes figures, UML placeholders,
 cross-references, and appendices: these are exactly the structures a weak parser tends to mishandle.




AI Testing & RAG Playbook                                                                                                 Page 9`,
  10: `Meridian Quality Systems — InsightIQ Documentation                                                                  Version 1.6




 7.1 Figure and Caption Association
 A parser must correctly associate a figure caption (such as "Figure 3: Ranking comparison...") with the
 placeholder or image it describes, and must not treat the caption as an unrelated, free-floating sentence.
 Incorrect association can cause a chunk to contain a caption with no context, or context with no caption, either
 of which degrades retrieval for any query about that figure.


 7.2 Cross-Reference Resolution
 This playbook contains numerous cross-references — "see Figure 3," "see Section 8," "see Appendix A" — that
 a human reader resolves automatically but that a naive chunker may split away from their relevant context, or
 that a retriever may fail to expand into the section they actually point to. A RAG system that can resolve "see
 Appendix A" into the actual glossary content in Appendix A, rather than treating it as an unresolvable dead-end
 phrase, demonstrates meaningfully more sophisticated retrieval than one that cannot.

 7.3 Appendix Boundary Detection
 Appendices (Appendix A and Appendix B in this document) sit outside the numbered section sequence and can
 confuse parsers that rely purely on heading-number patterns (1, 2, 3...) to detect section boundaries. A parser
 that fails to recognize "Appendix A" as a top-level heading equivalent to "Section 7" may merge appendix
 content into the preceding numbered section, or fail to chunk it as a distinct unit at all.



 8. Deployment Patterns
 InsightIQ supports two deployment patterns.

          Pattern              Description                                            Re-Ranking    Typical
                                                                                      Default       Latency
                                                                                                    Budget

          On-Prem              Runs entirely within MQS's own infrastructure, using   Enabled       Relaxed
                               ClusterGrid for embedding and retrieval workloads                    (internal
                                                                                                    tools)

          InsightIQ Cloud      Managed, multi-tenant deployment hosted by MQS         Disabled by   Strict (custo
                               for external customers                                 default       mer-facing)


 On-Prem deployments, run internally at MQS on ClusterGrid, default to enabling the Re-Ranking pass
 described in Section 4.5, since internal tooling generally tolerates higher latency in exchange for better answer
 quality. InsightIQ Cloud deployments default to disabling Re-Ranking, since customer-facing latency budgets
 are typically stricter, though any customer can enable it explicitly in their project configuration if answer quality
 matters more to them than response time.




AI Testing & RAG Playbook                                                                                             Page 10`,
  11: `Meridian Quality Systems — InsightIQ Documentation                                                             Version 1.6




    9. Case Study: Documentation Search
    This section walks through how InsightIQ indexes and serves queries against the very benchmark suite this
    playbook belongs to, as a concrete illustration of the concepts covered in Sections 3 through 8.

    The MQS documentation corpus — the FalconTest guide, the APIVerify handbook, this playbook, and the
    Engineering Standards Manual described elsewhere in this suite — is indexed using VectorCore-L (Section 3.2)
    at a chunk size of 550 characters (within the range recommended in Section 3.4), using Hybrid Retrieval
    (Section 4.3) at the default hybrid_alpha of 0.7, with Re-Ranking enabled, consistent with the On-Prem
    deployment pattern described in Section 8.

    A query such as "which cluster runs FalconTest jobs" is deliberately ambiguous in exactly the way Section 4.4's
    Keyword Retrieval strength is meant to help with: the literal term "cluster" appears in multiple documents
    referring to multiple distinct entities (Execution Cluster, Reporting Cluster, and ClusterGrid itself), and Hybrid
    Retrieval's keyword component helps surface all of them for the Re-Ranking pass to then disambiguate using
    fuller semantic context.



    10. Best Practices
•     Always match the embedding model between index time and query time; InsightIQ enforces this, but
      understanding why (Section 3.3) helps when designing multi-project setups.

•     Default to Hybrid Retrieval at hybrid_alpha 0.7 and tune only after establishing an Evaluation Metrics
      baseline (Section 6).

•     Enable Re-Ranking for On-Prem, internal-tooling deployments; leave it disabled by default for
      latency-sensitive InsightIQ Cloud deployments unless a customer explicitly needs higher accuracy.

•     Track Answer Faithfulness and Citation Accuracy separately — treating them as one combined score hides
      which part of the pipeline actually needs fixing.

•     Test parsing quality specifically on documents with figures, cross-references, and appendices, since these
      structures fail more often and more subtly than plain prose or simple tables.




AI Testing & RAG Playbook                                                                                        Page 11`,
  12: `Meridian Quality Systems — InsightIQ Documentation                                                                       Version 1.6




 Appendix A — Extended Glossary
        Term                            Definition

        VectorCore-S                    InsightIQ's compact, 384-dimension embedding model, optimized for speed

        VectorCore-L                    InsightIQ's larger, 1024-dimension embedding model, optimized for accuracy

        Dense Retrieval                 Retrieval strategy based on cosine similarity between embedding vectors

        Keyword Retrieval               Retrieval strategy based on BM25 term matching

        Hybrid Retrieval                Retrieval strategy combining Dense and Keyword results via hybrid_alpha

        hybrid_alpha                    Tunable parameter (0-1) controlling the Dense/Keyword balance in Hybrid Retrieval

        Re-Ranking                      Optional second-pass scoring of top-K candidates using a smaller, more precise
                                        model

        Retrieval Precision             Fraction of retrieved chunks that are actually relevant

        Retrieval Recall                Fraction of all relevant chunks that were successfully retrieved

        Answer Faithfulness             Whether a generated answer is fully supported by retrieved context

        Citation Accuracy               Whether cited sources actually contain the claimed information

        ModelMismatchError              Error InsightIQ raises when querying an index with a different embedding model
                                        than it was built with




AI Testing & RAG Playbook                                                                                                   Page 12`,
  13: `Meridian Quality Systems — InsightIQ Documentation                                 Version 1.6




 Appendix B — Sample End-to-End Configuration
          project: mqs-docs-search
          embedding:
          model: vectorcore-l
          chunking:
          size: 550
          overlap: 110
          retrieval:
          strategy: hybrid
          hybrid_alpha: 0.7
          top_k: 20
          reranking:
          enabled: true
          top_n: 5
          prompt:
          context_budget_pct: 70
          system_instruction_pct: 10
          generation:
          model: mqs-gen-1
          deployment:
          pattern: on_prem
          cluster: clustergrid




 References
 1 InsightIQ Embedding Model Benchmarks — internal report, MQS AI Platform Team.
 2 FalconTest Automation Framework Guide — this benchmark suite, Document 1.
 3 APIVerify Integration Handbook — this benchmark suite, Document 2.
 4 Engineering Standards Manual — this benchmark suite, Document 4.




AI Testing & RAG Playbook                                                            Page 13`,
  14: `Meridian Quality Systems — InsightIQ Documentation                                                   Version 1.6




 Questions to Try
 The following questions are provided to help you explore this document using your own RAG pipeline. No
 answers are provided here — try retrieving and generating answers yourself.


 1 What is InsightIQ used for at Meridian Quality Systems?
 2 Why does InsightIQ enforce embedding model consistency between index time and query time?
 3 Compare VectorCore-S and VectorCore-L.
 4 Which retrieval strategy and configuration would you recommend for a new production deployment, and
      why?

 5 What is the default value of hybrid_alpha in InsightIQ's Hybrid Retrieval?
 6 Which "Cluster" runs FalconTest jobs, according to the Case Study in Section 9?
 7 Does InsightIQ support embedding models other than VectorCore-S and VectorCore-L?
 8 What is the recommended chunk size range for VectorCore-L, according to Section 3.4?
 9 What is the difference between Answer Faithfulness and Citation Accuracy?
 10 Should Re-Ranking be enabled for an InsightIQ Cloud deployment? What does the document say
      determines this?




AI Testing & RAG Playbook                                                                                 Page 14`,
};

const ENGINEERING_STANDARDS_MANUAL_PAGES: Record<number, string> = {
  1: `                   Engineering Standards Manual

                                 Meridian Quality Systems
                                                                                               FT
             Internal Engineering Documentation · Revision 3.4 · Expert Guide


                                                                             R               A
                                                                            D
About This Document
                                                             —
      Difficulty



                                            A L
                                       ★★★★ Expert

                                       Full Pipeline Stress-Testing, Conflicting/Updated Policy Resolution,



                            N
      Best for
                                       OCR-Noise Tolerance, Multi-Hop Synthesis

      Approximate Chunks




               E
      Estimated EmbeddingsR            95

                                       95




             T
      Recommended RAG Stages           Parsing → Chunking → Retrieval → Generation → Evaluation




  IN
This document intentionally contains nearly every real-world problem a production RAG pipeline must handle.
Some questions in this document have no answer anywhere in the text.




                                                                                                              Page 1`,
  2: `Meridian Quality Systems — CONFIDENTIAL — INTERNAL USE ONLY            Rev. 3.4




 Table of Contents
 1. Document Control
 2. Purpose and Scope
 3. Definitions and Abbreviations
 4. Retry Policy (2022 Edition)
 5. Environment Access Standards
 6. Incident Escalation Procedure
 7. Code Review Requirements
 8. Data Retention Policy (2022 Edition)
 9. Retry Policy — Addendum (2024)
                                                                      FT
 10. Data Retention Policy — Addendum (2024)
 11. Deprecated Build Pipeline Procedure
 12. Current Build Pipeline Procedure
                                                                   RA
 13. Multi-Region Deployment Standards
 Appendix A — Abbreviations
 Appendix B — Cross-Reference Index
                                                                  D
 Appendix C — Incident Escalation Procedure (duplicate)
 Appendix D — Sample SEV-1 Incident Log (2023–2024)           —
 Glossary
 References
 Questions to Try
                                            A L
                               R N
                T E
   IN

Engineering Standards Manual                                            Page 2`,
  3: `Meridian Quality Systems — CONFIDENTIAL — INTERNAL USE ONLY                                                                Rev. 3.4




 1. Document Control
       Revision     Date             Author                         Summary

       1.0          2021-03-01       J. Alvarez, Eng. Standards     Initial release

       2.0          2022-07-15       J. Alvarez, Eng. Standards     Added Incident Escalation Procedure

       3.0          2023-11-02       R. Okafor, Eng. Standards      Added Data Retention Policy

       3.4          2024-05-20       R. Okafor, Eng. Standards      Added Retry Policy and Data Retention addenda;
                                                                    superseded relevant 2022/2023 sections




                                                                                                          FT
        NOTE: This manual applies to all Meridian Quality Systems engineering teams, including teams responsible for




                                                                                                        A
        FalconTest, APIVerify, InsightIQ, MockBridge, and BuildFlow. Where this manual conflicts with a product-specific
        guide, the most recently dated policy in this manual takes precedence for anything within this manual's scope
        (organizational process, not product default behavior).




 2. Purpose and Scope
                                                                                      DR
 This manual defines mandatory engineering standards for all MQS engineering teams. It covers retry policy at the



                                                                      —
 organizational level, environment access, incident escalation, code review, data retention, and build pipeline
 standards. It does not cover product-specific configuration defaults, which remain documented in each product's




                                                   L
 own guide (see References).




                                 N               A
                  E            R
                T
   IN

Engineering Standards Manual                                                                                                Page 3`,
  4: `Meridian Quality Systems — CONFIDENTIAL — INTERNAL USE ONLY                                                     Rev. 3.4




 3. Definitions and Abbreviations
       Term                    Definition

       MQS                     Meridian Quality Systems

       SEV-1                   Severity 1 incident: production-impacting, customer-facing

       SEV-2                   Severity 2 incident: production-impacting, not customer-facing

       RPO                     Recovery Point Objective

       RTO

       PII
                               Recovery Time Objective

                               Personally Identifiable Information

                                                                                                   FT
 Full abbreviation list continues in Appendix A.


 4. Retry Policy (2022 Edition)
                                                                                      R          A
                                                                                     D
 Effective 2022-07-15. See Section 9 for the 2024 addendum, which partially supersedes this section.

 All MQS testing tools, including FalconTest's Smart Retry engine, must default to a global retry limit of 3 attempts



                                                                     —
 for any automated test run, regardless of execution mode. This limit exists to prevent runaway retry loops from
 consuming shared ClusterGrid capacity during periods of environment instability.


 filed as an exception request.


                                                 A L
 Teams may not configure a retry limit higher than 3 without written approval from the Engineering Standards team,




                               R N
                T E
   IN

Engineering Standards Manual                                                                                     Page 4`,
  5: `Meridian Quality Systems — CONFIDENTIAL — INTERNAL USE ONLY                                                          Rev. 3.4




 5. Environment Access Standards
 Access to shared testing environments (staging, pre-production, and any environment connected to ClusterGrid) is
 granted through the standard access request process. Requests are reviewed within two business days.

       Environment Tier                    Approval Required                                Access Duration

       Development                         Team lead                                        Indefinite

       Staging                             Team lead                                        90 days, renewable

       Pre-Production

       Production (read-only)
                                           Engineering Standards team

                                           Engineering Standards team + Security

                                                                                                       FT
                                                                                            30 days, renewable

                                                                                            14 days, renewable




        Policy (not part of this manual) for that process.



                                                                                    R                A
        WARNING: Production write access is never granted through this process. See the separate Production Access




 6. Incident Escalation Procedure
                                                                                   D
 When a production-impacting issue is detected in any MQS-operated system, including InsightIQ Cloud
 deployments, the following escalation procedure applies.

                                                                    —
                                                A L
                                                [Flowchart Placeholder]




                                R N
                                Figure 4: Incident escalation flow from detection to resolution.




                 T E
 1 Detect — the issue is identified, either through automated monitoring or a manual report.
 2 Classify — the on-call engineer classifies the issue as SEV-1 or SEV-2 using the definitions in Section 3.




   IN
 3 Escalate — SEV-1 incidents page the on-call Engineering Standards representative immediately; SEV-2
      incidents are logged and reviewed at the next business-hours triage meeting.

 4 Resolve — the incident is resolved and a post-incident review is scheduled within 5 business days for any
      SEV-1 incident.

 See Appendix C for a duplicate copy of this procedure that was merged into this manual from a legacy wiki page
 during the 2023 documentation migration; Appendix C's wording differs slightly but describes the same procedure,
 and the version in this section (Section 6) is the authoritative one.




Engineering Standards Manual                                                                                          Page 5`,
  6: `Meridian Quality Systems — CONFIDENTIAL — INTERNAL USE ONLY                                                        Rev. 3.4




 7. Code Review Requirements
 All code changes to MQS-operated systems require review before merging. The following table describes review
 requirements by change category, organized as a nested structure: top-level rows are change categories, and
 each category groups two related sub-requirements.

       Change Category                           Requirement                                       Minimum
                                                                                                   Reviewers

       Standard change

       — Application code

       — Configuration change
                                                 Peer review required

                                                 Peer review required
                                                                                                   1



                                                                                                   F
                                                                                                   1
                                                                                                    T
       Sensitive change

       — Authentication/authorization code       Peer review + Security sign-off


                                                                                    R            A 2




                                                                                   D
       — Production data migration               Peer review + Engineering Standards sign-off      2

       Emergency change

       — SEV-1 hotfix                            Post-hoc review within 24 hours                   1 (post-hoc)

       — SEV-1 configuration rollback

                                                                    —
                                                 Post-hoc review within 24 hours                   1 (post-hoc)


 7.1 Reviewer Checklist


                                              A L
 The following two-column checklist summarizes what a reviewer must confirm before approving any
 Sensitive-change category pull request; both columns apply to every sensitive change reviewed.

       Column A — Code Quality


                                R N
       Tests added or updated for the change.
                                                                   Column B — Risk Assessment
                                                                   Rollback plan documented in the pull request



                  E
                                                                   description.
       No hardcoded credentials or secrets.




                T
                                                                   Blast radius identified (which systems/customers
       Follows the team's existing code style.
                                                                   are affected).




   IN
       No unrelated changes bundled into the same
                                                                   Security sign-off obtained if
       pull request.
                                                                   authentication/authorization code is touched.

                                                                   Engineering Standards sign-off obtained if a
                                                                   production data migration is involved.




Engineering Standards Manual                                                                                          Page 6`,
  7: `Meridian Quality Systems — CONFIDENTIAL — INTERNAL USE ONLY                                                           Rev. 3.4




    8. Data Retention Policy (2022 Edition)
    Effective 2023-11-02. See Section 10 for the 2024 addendum, which partially supersedes this section.

    All test execution logs generated by FalconTest, APIVerify, and InsightIQ must be retained for a minimum of 30
    days from the date of generation, after which they may be deleted or archived at the owning team's discretion.

    This retention requirement applies to logs only. Contract Baselines (APIVerify), Test Runner configuration, and
    other non-log artifacts are not subject to this policy and should be retained according to normal source-control
    practices.


    9. Retry Policy — Addendum (2024)
                                                                                                      FT
                                                                                                    A
    Effective 2024-05-20. This addendum partially supersedes Section 4.

    Following a review of ClusterGrid capacity incidents in early 2024, the organizational default retry limit is revised as


•
    follows:




                                                                                   DR
      For scheduled or unattended pipelines (including any FalconTest suite running in Adaptive mode as part of a
      nightly or scheduled job), the default retry limit is increased to 5 attempts.

•     For interactive or CI-gating pipelines (any pipeline that blocks a merge or deployment and is expected to



                                                                    —
      return a result while a person is actively waiting), the retry limit remains capped at 3 attempts, unchanged from
      Section 4.




                                                 A L
    Teams should note that FalconTest's own documentation (see the FalconTest Automation Framework Guide,
    Section 5.2) describes Smart Retry's default max_attempts as 3 at the product-configuration level. This
    organizational policy does not change that product default; it requires teams running scheduled/unattended



                                  N
    FalconTest suites to explicitly override max_attempts to 5 in their suite's falcontest.yaml, consistent with this
    addendum.




                    E           R
                  T
      IN

Engineering Standards Manual                                                                                           Page 7`,
  8: `Meridian Quality Systems — CONFIDENTIAL — INTERNAL USE ONLY                                                           Rev. 3.4




 10. Data Retention Policy — Addendum (2024)
 Effective 2024-05-20. This addendum partially supersedes Section 8.

 For any test execution log associated with a SEV-1 incident (as defined in Section 3 and escalated per Section 6),
 retention is extended from the standard 30 days to 90 days, to ensure logs remain available throughout any
 post-incident review and follow-up audit.

 All other test execution logs not associated with a SEV-1 incident remain subject to the original 30-day retention
 policy defined in Section 8. This addendum does not change retention for APIVerify Contract Baselines,

 under this policy.


                                                                                                    FT
 Performance Baselines, or InsightIQ evaluation datasets, none of which are classified as “test execution logs”




 11. Deprecated Build Pipeline Procedure


                                                                                          R       A
 Deprecated as of 2023-09-01. Retained here for historical reference only. Do not follow this procedure for new pipelines —
 see Section 12 for the current procedure.


 some artifacts from that OCR pass.]
                                                                                         D
 [Note: this section was migrated from a legacy scanned PDF during the 2022 documentation consolidation and retains


 The legacy build pipeline con figuration required teams to manually register each new service with B uildFlow using


                                                                      —
 the buildflow register command, then manually attach a ClusterGrid execution pro file before the the
 pipeline could run any FalconTest suites as part of a merge gate.




                                               A L
          buildflow register --service my-service --team my-team
          buildflow attach-profile --service my-service --profile clustergrid-default




                                 N
 This procedure required a rninimum of two manual steps per service and was a common source of onboarding
 delays for new teams, since the attach-profile step had no validation and silently failed if the profile name was



                               R
 misspelled.




                T E
   IN

Engineering Standards Manual                                                                                           Page 8
                                             Scanned copy — OCR pass 2, confidence 87%`,
  9: `Meridian Quality Systems — CONFIDENTIAL — INTERNAL USE ONLY                                                             Rev. 3.4




 12. Current Build Pipeline Procedure
 Effective 2023-09-01, replacing the procedure in Section 11.

 BuildFlow now auto-detects and registers new services on first push, using a buildflow.yaml manifest
 committed to the service's repository. No manual buildflow register or attach-profile step is required.

          service: my-service
          team: my-team
          cluster_profile: clustergrid-default
          falcontest_gate: true
          apiverify_gate: true

 If falcontest_gate and apiverify_gate are both set to true, BuildFlow will block a merge unless the

                                                                                                      FT
                                                                                                    A
 relevant FalconTest suite (Passive mode, per the FalconTest Automation Framework Guide, Section 4.1) and
 APIVerify Endpoint Groups both pass.


 13. Multi-Region Deployment Standards

                                                                                   DR
 The following section is formatted as two columns in the PDF rendering, consistent with a print-style standards appendix;
 both columns should be read left-to-right, top-to-bottom, as a single continuous requirement, not as two independent lists.


       Deployment Requirements
                                                                   —
                                                                   Verification Requirements




                                                  L
       Every production service must be deployed to a              APIVerify Endpoint Groups for any multi-region
       minimum of two MQS-operated regions.                        service must be run against both regions



                                                A
                                                                   independently; a passing result in one region
       ClusterGrid capacity must be reserved in both
                                                                   does not imply a passing result in the other.
       regions before a service is declared
       production-ready.




                               R N
       Failover between regions must be tested at least
       once per quarter, with results logged per the
                                                                   Drift Detection (see the AI Testing & RAG
                                                                   Playbook, Section 6) findings must be reviewed
                                                                   per-region, since regional configuration



                  E
                                                                   differences are a common source of
       retention requirements in Section 8/10.
                                                                   region-specific drift that a single-region check



                T                                                  would miss entirely.




   IN

Engineering Standards Manual                                                                                             Page 9`,
  10: `Meridian Quality Systems — CONFIDENTIAL — INTERNAL USE ONLY                                                            Rev. 3.4




 Appendix D — Sample SEV-1 Incident Log (2023–2024)
 The following is a sample excerpt of the SEV-1 incident log referenced by the retention requirements in Section 10.
 It is included as a long-table example; the real log is maintained in InsightIQ's incident tracking index, not in this
 manual.

     Incident     Date         Product      Region    Summary                                           Duratio   Status
     ID                                                                                                 n

     INC-2301     2023-01-1    APIVerify    us-east   Drift Detection false-positive storm after        3.2h      Resolve


     INC-2308
                  4

                  2023-02-0
                  2
                               FalconTest   us-west
                                                      schema migration

                                                      ClusterGrid capacity exhaustion during nightly
                                                      Adaptive run

                                                                                                          FT
                                                                                                        5.1h
                                                                                                                  d

                                                                                                                  Resolve
                                                                                                                  d

     INC-2314


     INC-2322
                  2023-02-1
                  9

                  2023-03-0
                               BuildFlow


                               InsightIQ
                                            us-east


                                            eu-west
                                                      Merge gate stuck due to attach-profile
                                                      misconfiguration



                                                                                     R
                                                      Embedding model mismatch after partial
                                                                                                        A
                                                                                                        1.4h


                                                                                                        2.0h
                                                                                                                  Resolve
                                                                                                                  d

                                                                                                                  Resolve




                                                                                    D
                  8                                   re-index                                                    d

     INC-2331     2023-04-1    APIVerify    eu-west   Baseline Sync auto-schedule enabled in error      0.8h      Resolve
                  1                                   for Strict Mode group                                       d

     INC-2345     2023-05-0
                  6
                               FalconTest   us-east


                                                                   —
                                                      Reporting Cluster backlog delayed report
                                                      publication
                                                                                                        4.6h      Resolve
                                                                                                                  d

     INC-2359


     INC-2367
                  2023-06-2
                  1

                  2023-07-3
                  0
                               ClusterGri
                               d

                               APIVerify

                                               A L
                                            us-west


                                            us-east
                                                      Worker node health-check flapping under load


                                                      Contract Baseline approved in error, reverted
                                                      same day
                                                                                                        6.3h


                                                                                                        0.5h
                                                                                                                  Resolve
                                                                                                                  d

                                                                                                                  Resolve
                                                                                                                  d

     INC-2378


     INC-2389
                  2023-08-1
                  7

                  2023-09-2
                               R N
                               InsightIQ


                               BuildFlow
                                            eu-west


                                            us-west
                                                      Re-Ranking latency spike on InsightIQ Cloud


                                                      Legacy attach-profile step silently failed for
                                                                                                        2.9h


                                                                                                        3.7h
                                                                                                                  Resolve
                                                                                                                  d

                                                                                                                  Resolve


     INC-2402


                T E
                  5

                  2023-11-0
                  9
                               FalconTest   us-east
                                                      new team

                                                      Execution Cluster misrouted jobs after
                                                      regional failover test
                                                                                                        5.5h
                                                                                                                  d

                                                                                                                  Resolve
                                                                                                                  d




   IN
     INC-2415     2023-12-1    APIVerify    eu-west   Drift severity misclassified as Info instead of   1.9h      Resolve
                  8                                   Critical                                                    d

     INC-2428     2024-01-2    ClusterGri   us-west   Capacity reservation conflict between two         4.2h      Resolve
                  2            d                      regions                                                     d

     INC-2441     2024-02-1    InsightIQ    eu-west   ModelMismatchError surfaced in production         1.1h      Resolve
                  4                                   query path                                                  d

     INC-2456     2024-03-3    FalconTest   us-east   Smart Retry loop exceeded pre-addendum            3.0h      Resolve
                  0                                   retry limit                                                 d

     INC-2470     2024-05-2    APIVerify    us-west   Post-addendum retention gap identified for        0.6h      Resolve
                  1                                   one log stream                                              d




Engineering Standards Manual                                                                                           Page 10`,
  11: `Meridian Quality Systems — CONFIDENTIAL — INTERNAL USE ONLY                                                                Rev. 3.4




 Appendix A — Abbreviations
       Abbreviation            Meaning

       MQS                     Meridian Quality Systems

       SEV-1                   Severity 1 incident

       SEV-2                   Severity 2 incident

       RPO                     Recovery Point Objective

       RTO

       PII
                               Recovery Time Objective

                               Personally Identifiable Information

                                                                                                       FT
       CI

       CD
                               Continuous Integration

                               Continuous Deployment


                                                                                  R                  A
                                                                                 D
       p95                     95th percentile



 Appendix B — Cross-Reference Index
       This Manual        Referenced Document
                                                                     —
                                                                     Section

       Section 4, 9

       Section 6

       Section 12
                                                   L
                          FalconTest Automation Framework Guide




                                                 A
                          FalconTest Automation Framework Guide

                          FalconTest Automation Framework Guide
                                                                     Section 5.2 (Smart Retry)

                                                                     Section 2 (Execution/Reporting Cluster)

                                                                     Section 4.1 (Passive Mode)

       Section 13

       Section 13

                               R N
                          APIVerify Integration Handbook

                          AI Testing & RAG Playbook
                                                                     Section 2.2 (Endpoint Groups)

                                                                     Section 6 (Drift Detection reference is to Playbook




                  E
                                                                     Section 4, cross-linked from Playbook Section 6)




                T
   IN

Engineering Standards Manual                                                                                               Page 11`,
  12: `Meridian Quality Systems — CONFIDENTIAL — INTERNAL USE ONLY                                                                      Rev. 3.4




 Appendix C — Incident Escalation Procedure (duplicate, see
 note)
 This appendix is a near-duplicate of Section 6, preserved from a legacy wiki page merged into this manual in 2023. The
 wording below differs slightly from Section 6 but describes the same underlying procedure. Section 6 is authoritative; this
 appendix exists only because the migration process did not remove the original page content.

 When a production-affecting problem is found in an MQS-run system, staff should follow these steps: first, the
 problem is identified via monitoring tooling or a manual report from a team member; second, the on-call engineer



                                                                                                            T
 determines whether the problem is SEV-1 or SEV-2 severity; third, SEV-1 problems result in an immediate page to
 the on-call Engineering Standards rep, while SEV-2 problems get logged for the next triage meeting; fourth, once
 resolved, a post-incident review is scheduled for SEV-1 issues within five business days of resolution.

                                                                                                           F
 Glossary
       Term                           Definition
                                                                                       R                 A
       Retry limit

       Contract Baseline                                                              D
                                      The maximum number of times an automated test is re-attempted after failure

                                      (See APIVerify Integration Handbook, Section 2.3)

       Test execution log

                                                                     —
                                      A log generated by FalconTest, APIVerify, or InsightIQ during a test or verification run




                                                  L
       Post-incident review           A structured review conducted after a SEV-1 incident is resolved

       Blast radius                   The set of systems or customers affected by a given change or incident




                                 N              A
                  E            R
                T
   IN

Engineering Standards Manual                                                                                                     Page 12`,
  13: `Meridian Quality Systems — CONFIDENTIAL — INTERNAL USE ONLY                                                      Rev. 3.4




 References
 1 FalconTest Automation Framework Guide — this benchmark suite, Document 1.
 2 APIVerify Integration Handbook — this benchmark suite, Document 2.
 3 AI Testing & RAG Playbook — this benchmark suite, Document 3.
 4 Production Access Policy — referenced in Section 5, not part of this benchmark suite.

 Questions to Try


                                                                                                FT
 The following questions are provided to help you explore this document using your own RAG pipeline. No answers
 are provided here — try retrieving and generating answers yourself. Some of these questions intentionally have no
 answer anywhere in this document.




                                                                               R              A
 1 What is the current organizational retry limit for a FalconTest suite running in Adaptive mode as part of a


                                                                              D
      nightly scheduled job?

 2 How long must a test execution log associated with a SEV-1 incident be retained?
 3 Compare the 2022 and 2024 Retry Policy sections. What changed, and what stayed the same?

                                                               —
 4 A new production service needs to go through code review, get deployed to two regions, and pass an


                                               L
      incident-escalation drill. Which sections of this manual apply, and in what order would a team typically use
      them?




                                 N           A
 5 How many reviewers are required for a production data migration change?
 6 What is “the Incident Escalation Procedure” in this manual — the version in Section 6, or the version in
      Appendix C?




                  E            R
 7 What encryption standard does this manual require for data at rest?
 8 What was required to register a new service with BuildFlow under the deprecated build pipeline procedure, and


                T
      what replaced it?

 9 Does the 2024 Data Retention addendum change the retention period for APIVerify Contract Baselines?


   IN
 10 Why does this manual say the 2024 Retry Policy addendum does not contradict FalconTest's own documented
      default of 3 retry attempts?




Engineering Standards Manual                                                                                     Page 13`,
};

export const SAMPLE_DOCUMENTS: SampleDocumentDefinition[] = [
  {
    id: "falcontest-guide",
    icon: "\ud83e\uddea",
    name: "FalconTest Automation Framework Guide",
    description: "A clean, well-structured product guide (fictional test-automation tool) \u2014 headings, config tables, code blocks. Rated \u2605 Beginner by its own author for parsing and basic retrieval.",
    teaches: ["structured technical docs", "config tables + code blocks", "basic chunking and retrieval"],
    difficulty: "clean",
    difficultyNote: "Rated \u2605 Beginner, \"best for Parsing, Markdown, Tables, Basic Chunking, Basic Retrieval\" by its own author. Clean structure throughout \u2014 a good baseline for seeing well-behaved parsing and chunking before trying the harder documents in this set.",
    pages: FALCONTEST_GUIDE_PAGES,
    pdfUrl: "/samples/falcontest-guide.pdf",
  },
  {
    id: "apiverify-handbook",
    icon: "\ud83d\udccb",
    name: "APIVerify Integration Handbook",
    description: "Longer paragraphs and explanations that deliberately span a page break (Section 5's \"Baseline Sync\" continues as \"Section 5.1\" on the next page). Rated \u2605\u2605 Intermediate \u2014 some questions need more than one chunk to answer.",
    teaches: ["chunk overlap", "cross-page continuations", "multi-chunk synthesis"],
    difficulty: "moderate",
    difficultyNote: "Rated \u2605\u2605 Intermediate, \"best for Chunking, Chunk Overlap, Semantic Retrieval, Multi-Chunk Synthesis.\" Parses cleanly \u2014 the real challenge is a section (Baseline Sync, Section 5) that's deliberately split across a page boundary, testing whether chunking/retrieval keeps a continued explanation coherent.",
    pages: APIVERIFY_HANDBOOK_PAGES,
    pdfUrl: "/samples/apiverify-handbook.pdf",
  },
  {
    id: "ai-testing-rag-playbook",
    icon: "\ud83e\udded",
    name: "AI Testing & RAG Playbook \u2014 A Guide to InsightIQ",
    description: "Figures, UML-style diagram placeholders, cross-references (\"see Figure 3,\" \"see Appendix A\"), and appendices that sit outside the numbered section sequence. Rated \u2605\u2605\u2605 Advanced \u2014 built specifically to stress-test parsing.",
    teaches: ["figures and captions", "cross-reference resolution", "appendix boundary detection"],
    difficulty: "challenging",
    difficultyNote: "Rated \u2605\u2605\u2605 Advanced by its own author, and says so explicitly: \"designed to demonstrate why parsing quality has an outsized effect on downstream retrieval.\" Diagram placeholders, figure captions, and appendices that don't follow the numbered-heading pattern are real, known parser stress points \u2014 this document is built to surface them, not a sign the parser is broken.",
    pages: AI_TESTING_RAG_PLAYBOOK_PAGES,
    pdfUrl: "/samples/ai-testing-rag-playbook.pdf",
  },
  {
    id: "engineering-standards-manual",
    icon: "\ud83d\udcd0",
    name: "Engineering Standards Manual",
    description: "Superseded-vs-current policy pairs, a duplicated appendix, a genuinely scanned page with real OCR noise (\"con figuration,\" \"pro file,\" \"rninimum\"), and questions with no answer anywhere in the text. Rated \u2605\u2605\u2605\u2605 Expert.",
    teaches: ["OCR noise tolerance", "conflicting/superseded policy resolution", "multi-hop synthesis", "unanswerable questions"],
    difficulty: "challenging",
    difficultyNote: "Rated \u2605\u2605\u2605\u2605 Expert, \"intentionally contains nearly every real-world problem a production RAG pipeline must handle.\" Page 8 is a genuinely scanned page (\"OCR pass 2, confidence 87%\") with real OCR artifacts \u2014 words like \"con figuration\" and \"rninimum\" are exactly what a real OCR pass produces, not a bug in this app's parser. Some of its own \"Questions to Try\" have no answer anywhere in the document, on purpose.",
    pages: ENGINEERING_STANDARDS_MANUAL_PAGES,
    pdfUrl: "/samples/engineering-standards-manual.pdf",
  },
];

export const DEFAULT_SAMPLE_DOCUMENT_ID = SAMPLE_DOCUMENTS[0]!.id;
