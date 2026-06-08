"""Generate a 2-page PDF about Machine Learning Fundamentals for pipeline testing."""
from fpdf import FPDF

TITLE = "Machine Learning Fundamentals"

PAGE1_SECTIONS = [
    (
        "What Is Machine Learning?",
        (
            "Machine learning (ML) is a branch of artificial intelligence that gives computer systems "
            "the ability to learn from data and improve their performance on tasks without being explicitly "
            "programmed. Instead of following hand-crafted rules, an ML model finds patterns in historical "
            "data and uses those patterns to make predictions or decisions on new, unseen data. "
            "The field was formally named by Arthur Samuel in 1959, who defined it as the study that gives "
            "computers the ability to learn without being explicitly programmed."
        ),
    ),
    (
        "Types of Machine Learning",
        (
            "Machine learning is broadly divided into three paradigms. "
            "Supervised learning is the most common: the model is trained on labelled examples, where both "
            "the input features and the correct output are provided. Common supervised tasks include "
            "classification (predicting a category) and regression (predicting a continuous value). "
            "Examples include email spam detection, house price prediction, and image classification. "
            "Unsupervised learning works with unlabelled data. The model discovers hidden structure on its "
            "own. Clustering algorithms such as K-Means group similar data points together. Dimensionality "
            "reduction techniques such as Principal Component Analysis (PCA) compress data while preserving "
            "the most important variance. "
            "Reinforcement learning trains an agent to make sequential decisions by rewarding desired "
            "behaviour and penalising undesired behaviour. The agent interacts with an environment, observes "
            "state, takes actions, and receives a reward signal. This paradigm powers game-playing systems "
            "like AlphaGo and robotics control systems."
        ),
    ),
    (
        "Key Terminology",
        (
            "Features are the measurable input variables used to make a prediction; they form the columns "
            "of a dataset. Labels are the target outputs the model learns to predict. A dataset is split "
            "into training data, used to fit the model, and test data, used to evaluate it on unseen "
            "examples. Overfitting occurs when a model memorises the training data so well that it performs "
            "poorly on new data. Underfitting occurs when a model is too simple to capture the underlying "
            "patterns. The bias-variance tradeoff describes the tension between a model that is too rigid "
            "(high bias) and one that is too sensitive to training noise (high variance). "
            "Hyperparameters are configuration settings chosen before training begins, such as learning "
            "rate, number of trees in a random forest, or the depth of a neural network."
        ),
    ),
]

PAGE2_SECTIONS = [
    (
        "Common Algorithms",
        (
            "Linear Regression models the relationship between a continuous target variable and one or more "
            "input features by fitting a straight line (or hyperplane) that minimises the sum of squared "
            "errors. It is interpretable and computationally cheap but assumes a linear relationship. "
            "Logistic Regression, despite its name, is a classification algorithm. It outputs the "
            "probability that an input belongs to a given class using the sigmoid function, thresholded "
            "at 0.5 for binary classification. "
            "Decision Trees split the feature space into regions by asking a series of yes/no questions. "
            "Each internal node represents a feature test; each leaf represents a predicted output. "
            "Random Forests build many decision trees on random subsets of the data and features, then "
            "average their predictions. This ensemble method reduces variance and is robust to overfitting. "
            "Support Vector Machines (SVM) find the hyperplane that maximises the margin between classes. "
            "Using the kernel trick, SVMs can separate data that is not linearly separable by projecting "
            "it into a higher-dimensional space."
        ),
    ),
    (
        "Neural Networks and Deep Learning",
        (
            "A neural network is a function approximator loosely inspired by biological neurons. It "
            "consists of an input layer, one or more hidden layers, and an output layer. Each connection "
            "has a weight; each neuron applies a non-linear activation function such as ReLU, sigmoid, "
            "or tanh to a weighted sum of its inputs. Training uses backpropagation: the gradient of the "
            "loss with respect to each weight is computed via the chain rule and the weights are updated "
            "using gradient descent. "
            "Deep learning refers to neural networks with many hidden layers. Convolutional Neural Networks "
            "(CNNs) use spatial filters to process images and have achieved human-level performance on "
            "image recognition benchmarks. Recurrent Neural Networks (RNNs) process sequential data by "
            "maintaining a hidden state that captures context from previous time steps. "
            "Transformer architectures, introduced in the paper 'Attention Is All You Need' (2017), "
            "replaced recurrence with self-attention mechanisms and became the foundation for large "
            "language models such as GPT and BERT."
        ),
    ),
    (
        "Model Evaluation and Validation",
        (
            "Evaluating a model correctly is as important as training it. For classification tasks the "
            "primary metrics are accuracy (fraction of correct predictions), precision (fraction of "
            "positive predictions that are truly positive), recall (fraction of true positives that were "
            "detected), and the F1 score (harmonic mean of precision and recall). The ROC curve plots the "
            "true positive rate against the false positive rate at varying thresholds; the area under the "
            "curve (AUC-ROC) summarises overall discriminative power. "
            "For regression tasks, common metrics include Mean Absolute Error (MAE), Mean Squared Error "
            "(MSE), and Root Mean Squared Error (RMSE). "
            "K-fold cross-validation partitions the dataset into K equal folds, trains on K-1 folds, "
            "and evaluates on the remaining fold, rotating K times. This gives a more reliable performance "
            "estimate than a single train/test split and helps detect overfitting."
        ),
    ),
]


class PDF(FPDF):
    def header(self):
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(60, 60, 60)
        self.cell(0, 8, TITLE, align="C")
        self.ln(4)
        self.set_draw_color(180, 180, 180)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(4)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 8, f"Page {self.page_no()}", align="C")

    def add_section(self, heading: str, body: str) -> None:
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 6, heading)
        self.ln(1)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 5, body)
        self.ln(4)


def build_pdf(output_path: str) -> None:
    pdf = PDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.set_margins(15, 15, 15)

    pdf.add_page()
    for heading, body in PAGE1_SECTIONS:
        pdf.add_section(heading, body)

    pdf.add_page()
    for heading, body in PAGE2_SECTIONS:
        pdf.add_section(heading, body)

    pdf.output(output_path)
    print(f"PDF written to: {output_path}")


if __name__ == "__main__":
    build_pdf("ml_fundamentals.pdf")
