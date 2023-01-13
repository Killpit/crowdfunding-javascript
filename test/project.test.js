const { expect } = require("chai");
const { ethers } = require("hardhat");

const etherToWei = (n) => {
    return ethers.utils.parseUnits(n, 'ether')
}

const dateToUNIX = (date) => {
    return Math.round(new Date(date).getTime() / 1000)
}

beforeEach(async function () {
    [address1, address2, ...address] = await ethers.getSigners();

    const creator = address1.address;
    const minimumContribution = etherToWei("10");
    const deadline = dateToUNIX('2023-05-21');
    const targetContribution = etherToWei("100000");
    const projectTitle = "Testing project";
    const projectDes = "Testing project description";

    const Project = await ethers.getContractFactory("Project");
    projectContract = await Project.deploy(creator, minimumContribution, deadline, targetContribution, projectTitle, projectDes);

})

describe("Check project variables & Contribute", async function () {
    it("Validate variables", async function () {
        expect(await projectContract.creator()).to.equal(address1.address);
        expect(await projectContract.minimumContribution()).to.equal(etherToWei("10"));
        expect(Number(await projectContract.deadline())).to.greaterThan(0);
        expect(await projectContract.minimumContribution()).to.equal(etherToWei("100000"));
        expect(await projectContract.projectDes()).to.equal("Testing project description");
        expect(await projectContract.noOfContributors()).to.equal(+0);
        expect(await projectContract.noOfContributors(0)).to.equal(0);
    })

    it("Contribute", async function () {
        const project = await projectContract.contribute(address1.address, {value: etherToWei('20')});
        const event = await project.wait();

        expect(event.events.length).to.equal(1);
        expect(event.events[0].event).to.equal("Funding received");
        expect(event.events[0].args.contributor).to.equal(address1.address);
        expect(event.events[0].args.amount).to.equal(etherToWei('20'));
        expect(event.events[0].args.currentTotal).to.equal(etherToWei('20'));

        expect(await projectContract.noOfContributors()).to.equal(1);
        expect(await projectContract.getContractBalance()).to.equal(etherToWei('20'));
    })

    it("State should change to Successful if targeted amount hit", async () => {
        await projectContract.contribute(address1.address, {value: etherToWei('60')});
        expect(Number(await projectContract.completeAt())).to.greaterThan(0);
        expect(await projectContract.state()).to.equal(+2);
    })
})

describe("Create withdraw request", async function () {
    it("Should fall if someone else try to request (Only owner can make request)", async () => {
        await expect(projectContract.connect(address2).createWithdrawRequest("Testing description", etherToWei('20'), address2.address)).to.be.revertedWith('You dont have access to perform this operation!');
    })

    it("Withdraw request should fail if status is not equal to successful", async () => {
        await expect(projectContract.connect(address1).createWithdrawRequest("Testing description", etherToWei('20'), address1.address)).to.be.revertedWith('Invalid state');
    })

    it("Request for withdraw", async () => {
        await projectContract.contribute(address1.address, {value: etherToWei('60')});
        const withdrawRequest = await projectContract.connect(address1).createWithdrawRequest("Testing description", etherToWei('20'), address1.address)
        const event = await withdrawRequest.wait();

        expect(event.events.length).to.equal(1);
        expect(event.events[0].event).to.equal("WithdrawRequestCreated");
        expect(event.events[0].args.description).to.equal("Testing description");
        expect(event.events[0].args.amount).to.equal(etherToWei('20'));
        expect(event.events[0].args.noOfVotes).to.equal(0);
        expect(event.events[0].args.isCompleted).to.equal(false);
        expect(event.events[0].args.reciptent).to.equal(address1.address);
    })
})

describe("Vote for withdraw request", async function () {

    it("Only contriutor can vote", async () => {
        await projectContract.contribute(address1.address, {value: etherToWei('20')});
        await projectContract.connect(address1).createWithdrawRequest("Testing description", etherToWei('20'), address1.address)
        await expect(projectContract.connect(address2).voteWithdrawRequest(0)).to.be.revertedWith('Only contributor can vote!');
    })

    it("Vote withdraw request", async () => {
        await projectContract.contribute(address1.address, {value: etherToWei('60')});
        await projectContract.contribute(address2.address, {value: etherToWei('70')});

        await projectContract.connect(address1).createWithdrawRequest("Testing description", etherToWei('20'), address1.address)
        const voteForWithdraw = await projectContract.connect(address2).voteWithdrawRequest(0)
        const event = await voteForWithdraw.wait();

        expect(event.events.length).to.equal(1);
        expect(event.events[0].event).to.equal("WithdrawVote");
        expect(event.events[0].args.voter).to.equal(address2.address);
        expect(Number(event.events[0].args.totalVote)).to.equal(1);
    })

    it("Should fail if request already vote", async () => {
        await projectContract.contribute(address1.address, {value: etherToWei('60')});
        await projectContract.contribute(address2.address, {value: etherToWei('70')});

        await projectContract.connect(address1).createWithdrawRequest("Testing description", etherToWei('20'), address1.address)
        await projectContract.connect(address2).voteWithdrawRequest(0)

        await expect(projectContract.connect(address2).voteWithdrawRequest(0)).to.be.revertedWith('You have already voted!');
    })
})

describe("Withdraw balance", async function () {
    if("Should fail if 50% contributor need to vote", async () => {
        await projectContract.contribute(address1.address, {value: etherToWei('60')});
        await projectContract.contribute(address7.address, {value: etherToWei('70')});

        await projectContract.connect(address1).createWithdrawRequest("Testing description", etherToWei('20'), address1.address)

        await expect(projectContract.connect(address1).withdrawRequestedAmount(0)).to.be.revertedWith('At least 50% of contributors need to vote for this request');
    })

    it("Withdraw requested balance", async () => {
        await projectContract.contribute(address1.address, {value: etherToWei('60')});
        await projectContract.contribute(address2.address, {value: etherToWei('70')});

        await projectContract.connect(address1).createWithdrawRequest("Testing description", etherToWei('20'), address1.address)
        await projectContract.connect(address1).voteWithdrawRequest(0)
        await projectContract.connect(address2).voteWithdrawRequest(0)

        const withdrawAmount = await projectContract.connect(address1).withdrawRequestedAmount(0);
        const event = await withdrawAmount.wait();

        expect(event.events.length).to.equal(1);
        expect(event.events[0].event).to.equal("AmountWithdrawSuccessful");
        expect(event.events[0].args.amount).to.equal(etherToWei('20'));
        expect(event.events[0].args.noOfVotes).to.equal(2);
        expect(event.events[0].args.isCompleted).to.equal(true);
        expect(event.events[0].args.reciptent).to.equal(address1.address);
    })

    it("Should fail if request already completed", async () => {
        await projectContract.contribute(address1.address, {value: etherToWei('60')});
        await projectContract.contribute(address2.address, {value: etherToWei('70')});

        await projectContract.connect(address1).createWithdrawRequest("Testing description", etherToWei('20'), address1.address)
        await projectContract.connect(address1).voteWithdrawRequest(0)
        await projectContract.connect(address2).voteWithdrawRequest(0)
        await projectContract.connect(address1).withdrawRequestedAmount(0)

        await expect(projectContract.connect(address1).withdrawRequestedAmount(0)).to.be.revertedWith('Request already completed');
    })
})