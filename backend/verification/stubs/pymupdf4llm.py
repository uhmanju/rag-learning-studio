_SAMPLE_PAGES = [
    "Manjunath Halakoppa\nExperience Summary\nQA Professional with nearly 8.8 years of experience in team "
    "management, comprehensive API testing, and rigorous evaluation of web and mobile applications.",
    "Role: Team Lead\nProject: Customer App\nClient: PhonePe\nPeriod: July-2020 to March-2022\n"
    "PhonePe Consumer app is a fintech platform used for UPI Payments, taking Insurance, Recharges and many more.",
    "Role: SDET\nProject: Merchant App and Customer App\nClient: PhonePe\nPeriod: Jan-2020 to Feb-2020\n"
    "Phonepe Merchant app was used to onboard Merchants onto the platform.",
    "Project: eJob\nClient: GoodYear Tires\nPeriod: Jan-2017 to April-2017\n"
    "Goodyear eJob is an Android mobile application designed for technicians of Goodyear.",
    "x",  # deliberately short page, to exercise the low-extraction-confidence flag path
]


def to_markdown(filepath, page_chunks=True, write_images=False, embed_images=False):
    return [
        {"text": text, "metadata": {"page_number": i + 1}}
        for i, text in enumerate(_SAMPLE_PAGES)
    ]
