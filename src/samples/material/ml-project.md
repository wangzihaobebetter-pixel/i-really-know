# SMS spam classification with TF-IDF and logistic regression

**Course:** DS 340 — Applied Machine Learning, Mini-Project 2  
**Submitted:** 21 March 2026

## Task and dataset

Binary classification of SMS messages as spam (1) or ham (0). I used the UCI SMS Spam Collection (n = 5572), split 70/15/15 into train/val/test with stratification on the label and seed = 7. Class balance is heavily skewed: 747 spam (13.4%) vs 4825 ham (86.6%). The skewed prior is something I want to keep in mind when I read precision and recall numbers.

## Preprocessing

Lower-casing, removal of non-alphanumeric characters except whitespace, and tokenisation with a simple regex `\b\w+\b`. No stemming or lemmatisation — I wanted to compare against a stemmed version as a follow-up. Built a TF-IDF representation with unigrams and bigrams, `min_df = 2`, `max_df = 0.95`, sublinear TF (so term frequency is replaced with 1 + log(tf)), and L2 row normalisation. Vocabulary size was 7,213. I also tried a binary count vectoriser; it underperformed TF-IDF by about 1 F1 point on the validation set, so I dropped it.

## Model and hyperparameters

Logistic regression with L2 regularisation, in scikit-learn 1.4. I swept `C ∈ {0.01, 0.1, 1, 10}` and `class_weight ∈ {None, "balanced"}` on the validation set. Best by F1 on val was `C = 1.0`, `class_weight = "balanced"`. The "balanced" weight noticeably helped recall on the minority class at a small precision cost, which is the trade-off I want for spam filtering.

## Metrics on the held-out test set (threshold = 0.5)

- Accuracy: 0.978
- Precision (spam): 0.962
- Recall (spam): 0.857
- F1 (spam): 0.906
- ROC-AUC: 0.984

The model is precise at the cost of missing about 14% of spam messages. For a personal inbox this trade-off is acceptable; for a high-volume operator I would push recall up by lowering the threshold or switching to a cost-sensitive loss.

## Error analysis

I read through the 17 false negatives on the test set. The dominant failure mode is short, ambiguous messages that look like ordinary SMS, e.g. "Call me back when u can" and "Did u get the thing I sent?". Many are essentially indistinguishable from ham in bag-of-words features, which suggests a small character-level CNN or character n-gram model might catch them.

Among the 4 false positives, three were marketing or order-update messages whose vocabulary overlaps with spam ("free", "claim", "won") even though they are legitimate. I am not sure I want the model to be more aggressive here — over-flagging legitimate transactional SMS would erode user trust.

## Next steps

The next things I would try: (i) a small character n-gram model or fine-tuned DistilBERT for the short-message false-negative regime, (ii) threshold tuning against a recall target rather than the default 0.5, (iii) calibration and a cost-sensitive loss that penalises spam-misses more than false positives in proportion to estimated downstream cost.
