import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TermsAndConditionsModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const TermsAndConditionsModal = ({
  open = false,
  onOpenChange,
}: TermsAndConditionsModalProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] bg-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Terms and Conditions
          </DialogTitle>
          <DialogDescription>
            Please read our terms and conditions carefully before registering as
            an agent.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[350px] rounded-md border p-4">
          <div className="space-y-4 text-sm">
            <h3 className="font-semibold">1. General Terms</h3>
            <p>
              By registering as an agent with Handling Umroh, you agree to abide
              by these terms and conditions. These terms govern your
              relationship with Handling Umroh and outline the responsibilities
              and expectations of both parties.
            </p>

            <h3 className="font-semibold">2. Agent Eligibility</h3>
            <p>
              To register as an agent, you must be a legally registered travel
              agency with a valid license to operate in your jurisdiction. You
              must provide accurate and complete information during the
              registration process.
            </p>

            <h3 className="font-semibold">3. Agent Responsibilities</h3>
            <p>
              As a registered agent, you are responsible for accurately
              representing Handling Umroh services to your clients. You must not
              make false claims or promises regarding our services. You are
              responsible for maintaining the confidentiality of your account
              credentials.
            </p>

            <h3 className="font-semibold">4. Commission Structure</h3>
            <p>
              Commission rates will be as agreed upon in your agent agreement.
              Commissions are paid only on completed and fully paid bookings.
              Handling Umroh reserves the right to modify the commission
              structure with prior notice.
            </p>

            <h3 className="font-semibold">5. Booking Procedures</h3>
            <p>
              All bookings must be made through the official Handling Umroh
              booking system. Agents must provide complete and accurate client
              information for all bookings. Handling Umroh is not responsible
              for issues arising from incorrect information provided by agents.
            </p>

            <h3 className="font-semibold">6. Payment Terms</h3>
            <p>
              Agents must adhere to the payment schedules specified for each
              booking. Failure to make timely payments may result in booking
              cancellations and potential penalties. All payments must be made
              through approved payment methods.
            </p>

            <h3 className="font-semibold">7. Cancellation Policy</h3>
            <p>
              Cancellation policies vary by package and are specified at the
              time of booking. Agents are responsible for communicating these
              policies to their clients. Handling Umroh reserves the right to
              enforce cancellation fees as per the policy.
            </p>

            <h3 className="font-semibold">8. Termination of Agency</h3>
            <p>
              Handling Umroh reserves the right to terminate any agency
              relationship for violations of these terms, fraudulent activity,
              or any action that may harm our reputation or business interests.
              Upon termination, all pending commissions will be reviewed on a
              case-by-case basis.
            </p>

            <h3 className="font-semibold">9. Confidentiality</h3>
            <p>
              Agents must maintain the confidentiality of all proprietary
              information shared by Handling Umroh. This includes pricing
              structures, marketing strategies, and client information. Breach
              of confidentiality may result in immediate termination and
              potential legal action.
            </p>

            <h3 className="font-semibold">10. Amendments to Terms</h3>
            <p>
              Handling Umroh reserves the right to amend these terms and
              conditions at any time. Agents will be notified of any changes,
              and continued use of our services constitutes acceptance of the
              modified terms.
            </p>
          </div>
        </ScrollArea>
        <div className="flex justify-end mt-4">
          <DialogClose asChild>
            <Button variant="default">I Understand</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TermsAndConditionsModal;
